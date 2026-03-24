import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { scheduleTaskReminder, cancelTaskReminder } from '../services/task-reminder.service';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

export async function createTask(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const data = { ...req.body, userId };
    if (data.recordDate) data.recordDate = new Date(data.recordDate);
    if (data.publishDate) data.publishDate = new Date(data.publishDate);
    if (data.sponsorDeadline) data.sponsorDeadline = new Date(data.sponsorDeadline);

    const task = await prisma.task.create({ data });

    if (task.recordDate) {
      try { await scheduleTaskReminder(task.id, task.recordDate); } catch { /* non-fatal */ }
    }

    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create task' });
  }
}

export async function listTasks(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const platform = req.query.platform as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const page = Number(req.query.page) || 1;
    const take = Number(req.query.limit) || 20;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (platform) where.platform = platform;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.recordDate = {};
      if (from) (where.recordDate as any).gte = new Date(from);
      if (to) (where.recordDate as any).lte = new Date(to);
    }

    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ recordDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        include: { project: { select: { id: true, title: true } } },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, limit: take } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list tasks' });
  }
}

export async function getTask(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { project: { select: { id: true, title: true } } },
    });
    if (!task) { res.status(404).json({ success: false, error: 'Task not found' }); return; }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
}

export async function updateTask(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const data = { ...req.body };
    if (data.recordDate) data.recordDate = new Date(data.recordDate);
    if (data.publishDate) data.publishDate = new Date(data.publishDate);
    if (data.sponsorDeadline) data.sponsorDeadline = new Date(data.sponsorDeadline);

    const result = await prisma.task.updateMany({ where: { id, userId }, data });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Task not found' }); return; }

    const updated = await prisma.task.findUnique({ where: { id } });

    if (data.recordDate && updated?.recordDate) {
      try {
        await cancelTaskReminder(id);
        await scheduleTaskReminder(id, updated.recordDate);
      } catch { /* non-fatal */ }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
}

export async function deleteTask(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    try { await cancelTaskReminder(id); } catch { /* non-fatal */ }
    const result = await prisma.task.deleteMany({ where: { id, userId } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Task not found' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}
