import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs-extra'
import { getUserDataDir } from './paths'

type LoginResult = {
  userDataDir: string
  isLogged: boolean
  storageStatePath: string
  fbUserId: string | null
}

async function getFbUserIdFromCookies(context: any): Promise<string | null> {
  try {
    const cookies = await context.cookies()
    const cUser = cookies.find((c: any) => c.name === 'c_user')
    return cUser?.value || null
  } catch {
    return null
  }
}

export async function openLoginWindow(userId: string, accountId: string): Promise<LoginResult> {
  const userDataDir = getUserDataDir(userId, accountId)
  const headless = String(process.env.HEADLESS || 'false').toLowerCase() === 'true'

  await fs.ensureDir(userDataDir)
  console.log('[login] userDataDir =', userDataDir)

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      '--disable-notifications',
      '--disable-infobars',
      '--disable-dev-shm-usage'
    ]
  })

  const page = await context.newPage()
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' })

  let fbUserId: string | null = await getFbUserIdFromCookies(context)
  let isLogged = !!fbUserId

  if (!isLogged) {
    try {
      while (!context.isClosed()) {
        fbUserId = await getFbUserIdFromCookies(context)
        if (fbUserId) { isLogged = true; break }
        await page.waitForTimeout(1000)
      }
    } catch {}
  }

  const storageStatePath = path.join(userDataDir, 'storage-state.json')
  try {
    const state = await context.storageState()
    await fs.outputJson(storageStatePath, state, { spaces: 2 })
  } catch {}

  // Espera o usuário fechar a janela para concluir
  await new Promise<void>(resolve => { context.on('close', () => resolve()) })

  return { userDataDir, isLogged, storageStatePath, fbUserId }
}
