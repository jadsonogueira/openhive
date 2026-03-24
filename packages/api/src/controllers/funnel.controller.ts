import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

// === Funnel CRUD ===

export async function createFunnel(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const { stages, ...funnelData } = req.body;

    const funnel = await prisma.funnel.create({
      data: {
        ...funnelData,
        userId,
        ...(stages && stages.length > 0 && {
          stages: {
            create: stages.map((s: any, idx: number) => ({
              title: s.title,
              description: s.description || null,
              color: s.color || '#6366f1',
              order: s.order ?? idx,
              ...(s.steps && s.steps.length > 0 && {
                steps: {
                  create: s.steps.map((st: any, stIdx: number) => ({
                    title: st.title,
                    description: st.description || null,
                    type: st.type || 'OTHER',
                    link: st.link || null,
                    status: st.status || 'TODO',
                    order: st.order ?? stIdx,
                  })),
                },
              }),
            })),
          },
        }),
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });
    res.status(201).json({ success: true, data: funnel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create funnel' });
  }
}

export async function listFunnels(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);

    const funnels = await prisma.funnel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { steps: true } } },
        },
      },
    });

    res.json({ success: true, data: funnels });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list funnels' });
  }
}

export async function getFunnel(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({
      where: { id, userId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }
    res.json({ success: true, data: funnel });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get funnel' });
  }
}

export async function updateFunnel(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const { title, description } = req.body;

    const result = await prisma.funnel.updateMany({ where: { id, userId }, data: { title, description } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const updated = await prisma.funnel.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update funnel' });
  }
}

export async function deleteFunnel(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const result = await prisma.funnel.deleteMany({ where: { id, userId } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete funnel' });
  }
}

// === Stage CRUD ===

export async function addStage(req: AuthRequest, res: Response) {
  try {
    const funnelId = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({ where: { id: funnelId, userId } });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const stageCount = await prisma.funnelStage.count({ where: { funnelId } });
    const order = req.body.order ?? stageCount;

    const stage = await prisma.funnelStage.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        color: req.body.color || '#6366f1',
        order,
        funnelId,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json({ success: true, data: stage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add stage' });
  }
}

export async function updateStage(req: AuthRequest, res: Response) {
  try {
    const funnelId = paramId(req);
    const stageId = req.params.stageId as string;
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({ where: { id: funnelId, userId } });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const stage = await prisma.funnelStage.findFirst({ where: { id: stageId, funnelId } });
    if (!stage) { res.status(404).json({ success: false, error: 'Stage not found' }); return; }

    const updated = await prisma.funnelStage.update({
      where: { id: stageId },
      data: req.body,
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update stage' });
  }
}

export async function deleteStage(req: AuthRequest, res: Response) {
  try {
    const funnelId = paramId(req);
    const stageId = req.params.stageId as string;
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({ where: { id: funnelId, userId } });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const stage = await prisma.funnelStage.findFirst({ where: { id: stageId, funnelId } });
    if (!stage) { res.status(404).json({ success: false, error: 'Stage not found' }); return; }

    await prisma.funnelStage.delete({ where: { id: stageId } });
    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete stage' });
  }
}

export async function reorderStages(req: AuthRequest, res: Response) {
  try {
    const funnelId = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({ where: { id: funnelId, userId } });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const { stageIds } = req.body as { stageIds: string[] };
    await prisma.$transaction(
      stageIds.map((id, index) =>
        prisma.funnelStage.update({ where: { id }, data: { order: index } }),
      ),
    );

    const stages = await prisma.funnelStage.findMany({
      where: { funnelId },
      orderBy: { order: 'asc' },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: stages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to reorder stages' });
  }
}

// === Step CRUD ===

export async function addStep(req: AuthRequest, res: Response) {
  try {
    const funnelId = paramId(req);
    const stageId = req.params.stageId as string;
    const userId = await resolveOwnerId(req.userId!);

    const funnel = await prisma.funnel.findFirst({ where: { id: funnelId, userId } });
    if (!funnel) { res.status(404).json({ success: false, error: 'Funnel not found' }); return; }

    const stage = await prisma.funnelStage.findFirst({ where: { id: stageId, funnelId } });
    if (!stage) { res.status(404).json({ success: false, error: 'Stage not found' }); return; }

    const stepCount = await prisma.funnelStep.count({ where: { stageId } });
    const order = req.body.order ?? stepCount;

    const step = await prisma.funnelStep.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        type: req.body.type || 'OTHER',
        link: req.body.link || null,
        status: req.body.status || 'TODO',
        order,
        stageId,
      },
    });
    res.status(201).json({ success: true, data: step });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add step' });
  }
}

export async function updateStep(req: AuthRequest, res: Response) {
  try {
    const stageId = req.params.stageId as string;
    const stepId = req.params.stepId as string;

    const step = await prisma.funnelStep.findFirst({ where: { id: stepId, stageId } });
    if (!step) { res.status(404).json({ success: false, error: 'Step not found' }); return; }

    const updated = await prisma.funnelStep.update({ where: { id: stepId }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update step' });
  }
}

export async function deleteStep(req: AuthRequest, res: Response) {
  try {
    const stageId = req.params.stageId as string;
    const stepId = req.params.stepId as string;

    const step = await prisma.funnelStep.findFirst({ where: { id: stepId, stageId } });
    if (!step) { res.status(404).json({ success: false, error: 'Step not found' }); return; }

    await prisma.funnelStep.delete({ where: { id: stepId } });
    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete step' });
  }
}

export async function moveStep(req: AuthRequest, res: Response) {
  try {
    const stepId = req.params.stepId as string;
    const { targetStageId, order } = req.body;

    const step = await prisma.funnelStep.findUnique({ where: { id: stepId } });
    if (!step) { res.status(404).json({ success: false, error: 'Step not found' }); return; }

    const updated = await prisma.funnelStep.update({
      where: { id: stepId },
      data: { stageId: targetStageId, order },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to move step' });
  }
}
