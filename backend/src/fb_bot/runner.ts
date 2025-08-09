import { BrowserContext, Page, Locator } from 'playwright'
import { supabase } from '../supabaseClient'
import { openContextForAccount } from './context'
import { upsertLead } from '../api/leads'
import { sanitizeFacebookUrl } from '../utils/sanitizeFacebookUrl'
import { config as loadEnv } from 'dotenv'

loadEnv()

/* =============================================================================
   PipeFox — Facebook Runner (2025)
   - Post-only screenshots (excludes comments)
   - Multi-strategy DOM selectors
   - GraphQL/network fallback to enrich metadata (permalink/media)
   - Smart clipping (author + message + media, no comments)
   ============================================================================= */

/* ---------------------------------- CONSTS --------------------------------- */
const FEED = 'div[role="feed"]'
const POST_QUERY = [
  `${FEED} div[role="article"]:has([data-ad-rendering-role="story_message"])`,
  `${FEED} div[role="article"]:has([data-ad-comet-preview="message"])`,
  `${FEED} div[role="article"]:has(a[role="link"][href*="/posts/"])`,
  `${FEED} div[role="article"]:has(a[role="link"][href*="/permalink/"])`,
].join(', ')

const COMMENT_HINTS = [/^comment\b/i, /^coment[aá]rio\b/i, /^comentario\b/i]
const SEE_MORE = [/^see (more|less)/i, /^ver mais/i, /^ver m[aá]s/i]

const ENV_WEBHOOK = process.env.N8N_WEBHOOK_URL ?? ''

/* --------------------------------- TYPES ----------------------------------- */
interface WorkflowNode { id: string; group_url: string; group_name: string; prompt: string; is_active: boolean; keywords?: string[] }
export interface WorkflowConfig { id: string; account_id: string; nodes: WorkflowNode[] }

export interface ShotMeta { id: string; url: string; timestamp: string; node_id: string; media?: string[]; authorId?: string; postId?: string }

/* ------------------------------ STATE CONTROL ------------------------------ */
const running = new Map<string, boolean>()

/* =============================== PUBLIC API ================================ */
export async function startRunner(cfg: WorkflowConfig) {
  if (running.has(cfg.id)) return
  running.set(cfg.id, true)

  const results = await Promise.allSettled(cfg.nodes.map((n) => processGroup(cfg, n)))
  console.log(`[runner] ${results.filter(r => r.status==='fulfilled').length} grupos OK, ${results.filter(r => r.status==='rejected').length} falharam — workflow ${cfg.id}`)

  running.delete(cfg.id)
}

export async function stopRunner(id: string) {
  running.delete(id)
  await supabase.from('workflows').update({ status: 'stopped' }).eq('id', id)
}

/* =============================== GROUP LEVEL =============================== */
async function processGroup(cfg: WorkflowConfig, node: WorkflowNode) {
  console.log(`[runner] grupo: ${node.group_name}`)
  let ctx: BrowserContext | null = null

  try {
    const { data: acc } = await supabase.from('accounts').select('user_id').eq('id', cfg.account_id).single()
    if (!acc) throw new Error('Conta não encontrada')

    ctx = await openContextForAccount(acc.user_id, cfg.account_id)
    const page = await ctx.newPage()

    // attach GraphQL sniffer
    const gql = enableGraphQLSniffer(page)

    await page.goto(node.group_url, { waitUntil: 'load', timeout: 60_000 })
    const shots = await collectShots(page, node, gql)

    if (shots.length) {
      await Promise.allSettled(shots.map(({ data, png }) => sendShotToN8n(data, png, node.group_name, node.prompt)))
    } else {
      console.log('[runner] nenhum post novo')
    }
  } catch (err) {
    console.error('[runner] erro no grupo', err)
  } finally {
    if (ctx) await ctx.close().catch(() => {})
  }
}

/* ========================= SCREENSHOT COLLECTION ========================== */
async function collectShots(page: Page, node: WorkflowNode, gql: GraphQLSniffer) {
  const MAX_EMPTY = 3
  const collected: { data: ShotMeta; png: Buffer }[] = []
  const seen = new Set<string>()

  await page.waitForSelector(FEED, { timeout: 60_000 })
  let empty = 0

  for (;;) {
    await Promise.race([
      page.waitForSelector(`${POST_QUERY}:not([data-pipefox])`, { timeout: 15_000 }).catch(() => {}),
      page.waitForTimeout(4_000),
    ])

    const posts = await page.locator(`${POST_QUERY}:not([data-pipefox])`).all()
    if (!posts.length) {
      if (++empty >= MAX_EMPTY) break
    } else empty = 0

    for (const post of posts) {
      try {
        await post.evaluate(n => n.setAttribute('data-pipefox', 'done'))
        if (!(await post.isVisible())) continue

        // exclude comments by aria-label
        const aria = (await post.getAttribute('aria-label')) || ''
        if (COMMENT_HINTS.some(re => re.test(aria))) continue

        // expand see more
        for (const pat of SEE_MORE) {
          const btn = post.getByRole('button', { name: pat })
          if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 1500 }).catch(() => {})
        }

        // choose target
        const target = await pickBestTarget(post)
        const clip = await computeSmartClip(page, target)
        const png = await page.screenshot({ type: 'png', clip })

        // DOM permalink (fallback)
        const domMeta = await makeShotMeta(post, node.id)

        // try to enrich with GraphQL data
        const enriched = await enrichFromGraphQL(gql, domMeta)

        const uniqueKey = enriched.postId || enriched.id
        if (seen.has(uniqueKey)) continue

        const lead = await upsertLead(node.id, enriched.url)
        if (!lead) continue

        seen.add(uniqueKey)
        collected.push({ data: enriched, png })
        console.log(`[collect] post ${enriched.id}`)
      } catch {}
    }

    await page.mouse.wheel(0, Math.floor((page.viewportSize()?.height ?? 800) * 0.9))
    await page.waitForTimeout(800 + Math.random() * 500)
  }

  return collected
}

/* -------------------------- PICK SCREENSHOT TARGET ------------------------- */
async function pickBestTarget(article: Locator): Promise<Locator> {
  const wrappers = [
    '[data-ad-rendering-role="story_card"]',
    '[data-ad-comet-preview="story_card"]',
  ]
  for (const sel of wrappers) {
    const loc = article.locator(sel).first()
    if (await loc.isVisible().catch(() => false)) return loc
  }
  return article
}

/* ----------------------------- SMART CLIPPER ------------------------------- */
async function computeSmartClip(page: Page, container: Locator) {
  const h = await container.elementHandle()
  if (!h) return await bboxOfLocator(container)

  const rect = await page.evaluate((root: HTMLElement) => {
    const rectOf = (el: Element | null) => el ? (el as HTMLElement).getBoundingClientRect() : null
    const qs = (sel: string) => root.querySelector(sel)
    const parts = [
      qs('[data-ad-rendering-role="story_header"]'),
      qs('[data-ad-rendering-role="story_message"]'),
      qs('[data-ad-comet-preview="message"]'),
      qs('img'),
      qs('video'),
      qs('[role="img"]'),
    ]

    let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0, found = false
    for (const p of parts) {
      const r = rectOf(p)
      if (!r) continue
      found = true
      minX = Math.min(minX, r.left)
      minY = Math.min(minY, r.top)
      maxX = Math.max(maxX, r.right)
      maxY = Math.max(maxY, r.bottom)
    }

    const base = rectOf(root)
    if (!base) return null
    if (!found) return base

    const left = Math.max(minX, base.left)
    const top = Math.max(minY, base.top)
    const right = Math.min(maxX, base.right)
    const bottom = Math.min(maxY, base.bottom)
    return new DOMRect(left, top, right - left, bottom - top)
  }, h)

  if (!rect) return await bboxOfLocator(container)
  return { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.max(1, rect.width), height: Math.max(1, rect.height) } as const
}

async function bboxOfLocator(loc: Locator) {
  const box = await loc.boundingBox()
  if (!box) throw new Error('Elemento invisível para screenshot')
  return { x: box.x, y: box.y, width: box.width, height: box.height } as const
}

/* ------------------------- METADATA (DOM fallback) ------------------------- */
async function makeShotMeta(el: Locator, nodeId: string): Promise<ShotMeta> {
  let href = ''
  try {
    const timeLink = await el.locator('a[role="link"][href*="/posts/"], a[role="link"][href*="/permalink/"], a[role="link"][href*="/videos/"], a[role="link"][href*="/photo/"]').first()
    if (await timeLink.isVisible().catch(() => false)) href = (await timeLink.getAttribute('href')) || ''
    if (!href) {
      const any = await el.locator('a[href*="/posts/"], a[href*="/permalink/"], a[href*="/videos/"], a[href*="/photo/"]').first()
      if (await any.isVisible().catch(() => false)) href = (await any.getAttribute('href')) || ''
    }
  } catch {}

  if (href && !href.startsWith('http')) href = `https://facebook.com${href}`
  href = sanitizeFacebookUrl(href)

  const idMatch = href.match(/(?:posts|permalink|videos|photo)\/(\d+)/)
  const id = idMatch ? idMatch[1] : `${Date.now()}${Math.random().toString(16).slice(2, 6)}`
  return { id, url: href || `https://facebook.com/post/${id}`, timestamp: new Date().toISOString(), node_id: nodeId }
}

/* ============================ GRAPHQL SNIFFER ============================== */

type GraphQLSniffer = ReturnType<typeof enableGraphQLSniffer>

function enableGraphQLSniffer(page: Page) {
  const store: {
    stories: Record<string, { permalink?: string; media?: string[]; authorId?: string; postId?: string }>
  } = { stories: {} }

  page.on('response', async (res) => {
    try {
      const url = res.url()
      if (!/graphql/.test(url)) return
      if (!/facebook/.test(url)) return
      const ct = res.headers()['content-type'] || ''
      if (!ct.includes('application/json')) return
      const text = await res.text()
      if (!text) return

      // parse permissively (FB returns JSON with extensions)
      const json = JSON.parse(text)
      extractFromGraphQL(json, store)
    } catch {}
  })

  return {
    pickByIds(ids: string[]) {
      for (const id of ids) {
        const hit = store.stories[id]
        if (hit) return hit
      }
      return undefined
    },
    anyFor(permalink: string) {
      // match by id in permalink
      const m = permalink.match(/(\d{8,})/g)
      if (!m) return undefined
      return this.pickByIds(m)
    },
  }
}

function extractFromGraphQL(json: any, store: any) {
  // extremely defensive traversal
  const stack = [json]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    // Look for story objects
    if (node.__typename === 'Story' || node.comet_sections || node.attachments) {
      const id = node.legacy_story_id || node.story_id || node.id
      if (id) {
        const rec = (store.stories[id] ||= {})
        // permalink
        const pl = node.permalink_url || node.comet_permalink || node.url || node.wwwURL
        if (pl) rec.permalink = sanitizeFacebookUrl(pl)
        // author
        const actor = node.actors?.[0] || node.actor || node.author
        if (actor?.id) rec.authorId = actor.id
        // media
        const media: string[] = []
        const pushUrl = (u?: string) => { if (u) media.push(u) }
        const walk = (o: any) => {
          if (!o || typeof o !== 'object') return
          if (o.playable_url) pushUrl(o.playable_url)
          if (o.playable_url_quality_hd) pushUrl(o.playable_url_quality_hd)
          if (o.uri) pushUrl(o.uri)
          if (o.url) pushUrl(o.url)
          Object.values(o).forEach(walk)
        }
        walk(node.attachments)
        walk(node.comet_sections)
        if (media.length) rec.media = Array.from(new Set(media))
        rec.postId = id
      }
    }

    // keep traversing
    for (const v of Object.values(node)) if (v && typeof v === 'object') stack.push(v)
  }
}

async function enrichFromGraphQL(gql: GraphQLSniffer, base: ShotMeta): Promise<ShotMeta> {
  const byPermalink = gql.anyFor(base.url)
  if (byPermalink) {
    return { ...base, url: byPermalink.permalink || base.url, media: byPermalink.media, authorId: byPermalink.authorId, postId: byPermalink.postId }
  }

  // try by ID present in base URL
  const ids = (base.url.match(/(\d{8,})/g) || [])
  const hit = gql.pickByIds(ids)
  if (hit) {
    return { ...base, url: hit.permalink || base.url, media: hit.media, authorId: hit.authorId, postId: hit.postId }
  }

  return base
}

/* ============================= N8N INTEGRATION ============================= */
async function sendShotToN8n(meta: ShotMeta, buf: Buffer, groupName = '', prompt = '') {
  if (!ENV_WEBHOOK) { console.log('[n8n] webhook ausente; pulando'); return }

  const payload = { ...meta, prompt, screenshot: buf.toString('base64'), screenshot_type: 'png', group_name: groupName }
  try {
    const res = await fetch(ENV_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    console.log(`[n8n] shot ${meta.id} enviado para ${groupName}`)
  } catch (err) {
    console.error('[n8n] falha no envio:', err)
  }
}
