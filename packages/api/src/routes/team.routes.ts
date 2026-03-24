import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/role.middleware';
import {
  createInvitation,
  acceptInvitation,
  listMembers,
  listInvitations,
  updateMemberRole,
  removeMember,
  deleteInvitation,
  getInvitationByToken,
} from '../controllers/team.controller';

const router = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
});

const acceptSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(200),
  password: z.string().min(6).max(100),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

// Public routes (no auth needed)
router.get('/invite/:token', getInvitationByToken);
router.post('/accept', validate(acceptSchema), acceptInvitation);

// Protected routes
router.use(authMiddleware);
router.get('/members', listMembers);
router.get('/invitations', listInvitations);
router.post('/invite', requireRole('ADMIN'), validate(inviteSchema), createInvitation);
router.put('/members/:id/role', requireRole('OWNER'), validate(updateRoleSchema), updateMemberRole);
router.delete('/members/:id', requireRole('OWNER'), removeMember);
router.delete('/invitations/:id', requireRole('ADMIN'), deleteInvitation);

export default router;
