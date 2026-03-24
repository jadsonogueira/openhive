import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

export async function createProject(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const { modules, ...projectData } = req.body;

    const project = await prisma.project.create({
      data: {
        ...projectData,
        userId,
        ...(modules && modules.length > 0 && {
          modules: {
            create: modules.map((m: any, idx: number) => ({
              title: m.title,
              content: m.content || null,
              order: m.order ?? idx,
            })),
          },
        }),
      },
      include: { modules: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create project' });
  }
}

export async function listProjects(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const status = req.query.status as string | undefined;
    const page = Number(req.query.page) || 1;
    const take = Number(req.query.limit) || 20;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          modules: { orderBy: { order: 'asc' } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, limit: take } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
}

export async function getProject(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        modules: { orderBy: { order: 'asc' } },
        tasks: { orderBy: { recordDate: 'asc' } },
      },
    });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get project' });
  }
}

export async function updateProject(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const result = await prisma.project.updateMany({ where: { id, userId }, data: req.body });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    const updated = await prisma.project.findUnique({
      where: { id },
      include: { modules: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
}

export async function deleteProject(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const result = await prisma.project.deleteMany({ where: { id, userId } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
}

export async function addModule(req: AuthRequest, res: Response) {
  try {
    const projectId = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const moduleCount = await prisma.projectModule.count({ where: { projectId } });
    const order = req.body.order ?? moduleCount;

    const mod = await prisma.projectModule.create({
      data: {
        title: req.body.title,
        content: req.body.content || null,
        order,
        projectId,
      },
    });
    res.status(201).json({ success: true, data: mod });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add module' });
  }
}

export async function updateModule(req: AuthRequest, res: Response) {
  try {
    const projectId = paramId(req);
    const moduleId = req.params.moduleId as string;
    const userId = await resolveOwnerId(req.userId!);

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const mod = await prisma.projectModule.findFirst({ where: { id: moduleId, projectId } });
    if (!mod) { res.status(404).json({ success: false, error: 'Module not found' }); return; }

    const updated = await prisma.projectModule.update({ where: { id: moduleId }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update module' });
  }
}

export async function deleteModule(req: AuthRequest, res: Response) {
  try {
    const projectId = paramId(req);
    const moduleId = req.params.moduleId as string;
    const userId = await resolveOwnerId(req.userId!);

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const mod = await prisma.projectModule.findFirst({ where: { id: moduleId, projectId } });
    if (!mod) { res.status(404).json({ success: false, error: 'Module not found' }); return; }

    await prisma.projectModule.delete({ where: { id: moduleId } });
    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete module' });
  }
}

export async function reorderModules(req: AuthRequest, res: Response) {
  try {
    const projectId = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const { moduleIds } = req.body as { moduleIds: string[] };

    await prisma.$transaction(
      moduleIds.map((id, index) =>
        prisma.projectModule.update({ where: { id }, data: { order: index } }),
      ),
    );

    const modules = await prisma.projectModule.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: modules });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to reorder modules' });
  }
}
