import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token not provided' });
    return;
  }

  const token = header.slice(7);

  // Internal service token (bot, MCP)
  if (env.INTERNAL_SERVICE_TOKEN && token === env.INTERNAL_SERVICE_TOKEN) {
    req.userId = 'service';
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
