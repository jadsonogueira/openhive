import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/role.middleware';
import {
  createFunnel,
  listFunnels,
  getFunnel,
  updateFunnel,
  deleteFunnel,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
  addStep,
  updateStep,
  deleteStep,
  moveStep,
} from '../controllers/funnel.controller';

const router = Router();

const stepTypeEnum = z.enum([
  'LANDING_PAGE', 'LEAD_CAPTURE', 'EMAIL_SEQUENCE', 'SALES_PAGE',
  'CHECKOUT', 'UPSELL', 'THANK_YOU', 'WEBINAR', 'VIDEO',
  'SOCIAL_POST', 'AD', 'OTHER',
]);

const stepSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: stepTypeEnum.optional(),
  link: z.string().max(500).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  order: z.number().int().optional(),
});

const stageSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  order: z.number().int().optional(),
  steps: z.array(stepSchema).optional(),
});

const createFunnelSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  stages: z.array(stageSchema).optional(),
});

const updateFunnelSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const reorderSchema = z.object({
  stageIds: z.array(z.string().uuid()),
});

const moveStepSchema = z.object({
  targetStageId: z.string().uuid(),
  order: z.number().int(),
});

router.use(authMiddleware);

// Funnel CRUD
router.post('/', requireRole('EDITOR'), validate(createFunnelSchema), createFunnel);
router.get('/', listFunnels);
router.get('/:id', getFunnel);
router.put('/:id', requireRole('EDITOR'), validate(updateFunnelSchema), updateFunnel);
router.delete('/:id', requireRole('ADMIN'), deleteFunnel);

// Stage CRUD
router.post('/:id/stages', requireRole('EDITOR'), validate(stageSchema), addStage);
router.put('/:id/stages/:stageId', requireRole('EDITOR'), validate(stageSchema.partial()), updateStage);
router.delete('/:id/stages/:stageId', requireRole('EDITOR'), deleteStage);
router.put('/:id/stages-order', requireRole('EDITOR'), validate(reorderSchema), reorderStages);

// Step CRUD
router.post('/:id/stages/:stageId/steps', requireRole('EDITOR'), validate(stepSchema), addStep);
router.put('/:id/stages/:stageId/steps/:stepId', requireRole('EDITOR'), validate(stepSchema.partial()), updateStep);
router.delete('/:id/stages/:stageId/steps/:stepId', requireRole('EDITOR'), deleteStep);
router.put('/:id/steps/:stepId/move', requireRole('EDITOR'), validate(moveStepSchema), moveStep);

export default router;
