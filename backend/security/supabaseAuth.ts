import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const token = auth.split(' ')[1];
  try {
    const base64Payload = token.split('.')[1];
    const payloadString = Buffer.from(base64Payload, 'base64').toString();
    const payload = JSON.parse(payloadString);

    if (!payload.sub) return res.status(401).json({ error: 'Invalid token payload' });

    req.user = { id: payload.sub, email: payload.email || null };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
