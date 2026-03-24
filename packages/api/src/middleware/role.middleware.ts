import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth.middleware';
import { Role } from '@prisma/client';

// Role hierarchy: OWNER > ADMIN > EDITOR > VIEWER
const ROLE_LEVEL: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

/**
 * Middleware that requires a minimum role level.
 * Service tokens are always allowed (they act as OWNER).
 */
export function requireRole(minRole: Role) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Service tokens bypass role check
      if (req.userId === 'service') {
        next();
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }

      if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch {
      res.status(500).json({ success: false, error: 'Failed to check permissions' });
    }
  };
}
