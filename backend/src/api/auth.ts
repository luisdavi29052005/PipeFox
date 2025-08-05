import { Router } from 'express'
import { signUp, signIn, signWithGoogle, sendReset, deleteUser } from '../services/auth.service'
import { requireAuth } from '../middleware/requireAuth'

const COOKIE = {
  name: 'auth',
  opts: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}

const router = Router()

router.post('/signup', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await signUp(email, password)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ user: data.user })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await signIn(email, password)
  if (error) return res.status(401).json({ error: error.message })
  res.cookie(COOKIE.name, data.session.access_token, COOKIE.opts)
  res.json({ user: data.user })
})

router.get('/google', (req, res) => {
  const { data } = signWithGoogle(`${process.env.PUBLIC_URL}/api/auth/callback`)
  res.redirect(data.url)
})

router.get('/callback', (req, res) => {
  if (req.query.access_token)
    res.cookie(COOKIE.name, req.query.access_token as string, COOKIE.opts)
  res.redirect('/dashboard')
})

router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie(COOKIE.name, COOKIE.opts)
  res.json({ ok: true })
})

router.post('/reset', async (req, res) => {
  const { email } = req.body
  const { error } = await sendReset(email, `${process.env.PUBLIC_URL}/reset`)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

router.delete('/account', requireAuth, async (req, res) => {
  await deleteUser(req.user.id)
  res.clearCookie(COOKIE.name, COOKIE.opts)
  res.json({ ok: true })
})

export default router
