import { supabaseAnon } from '../supabaseClient'
import { Request, Response, NextFunction } from 'express'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data, error } = await supabaseAnon.auth.getUser(token)
  if (error) return res.status(401).json({ error: error.message })

  req.user = data.user
  next()
}
