import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { publishToInstagram } from '../services/instagram.service';
import { schedulePost, cancelScheduledPost } from '../services/scheduler.service';

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

async function resolveUserId(reqUserId: string): Promise<string> {
  if (reqUserId !== 'service') return reqUserId;
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstUser) throw new Error('No users found - register at least one user first');
  return firstUser.id;
}

export async function createPost(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveUserId(req.userId!);
    const post = await prisma.post.create({
      data: { ...req.body, userId },
    });
    res.status(201).json({ success: true, data: post });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create post' });
  }
}

export async function listPosts(req: AuthRequest, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const page = Number(req.query.page) || 1;
    const take = Number(req.query.limit) || 20;
    const userId = await resolveUserId(req.userId!);
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (source) where.source = source;

    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      prisma.post.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.post.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, limit: take } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list posts' });
  }
}

export async function getPost(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const post = await prisma.post.findFirst({ where: { id, userId: req.userId } });
    if (!post) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get post' });
  }
}

export async function updatePost(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const post = await prisma.post.updateMany({ where: { id, userId: req.userId }, data: req.body });
    if (post.count === 0) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    const updated = await prisma.post.findUnique({ where: { id } });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
}

export async function deletePost(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    await cancelScheduledPost(id);
    const result = await prisma.post.deleteMany({ where: { id, userId: req.userId } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
}

export async function publishPost(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    await prisma.post.update({ where: { id }, data: { status: 'PUBLISHING' } });
    const result = await publishToInstagram(id);
    await prisma.post.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), instagramId: result.id },
    });
    res.json({ success: true, data: { instagramId: result.id } });
  } catch (err: any) {
    console.error('[Publish Error]', err?.message || err);
    const id = paramId(req);
    await prisma.post.update({ where: { id }, data: { status: 'FAILED' } });
    res.status(500).json({ success: false, error: err?.message || 'Failed to publish' });
  }
}

export async function schedulePostController(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const { scheduledAt } = req.body;
    const date = new Date(scheduledAt);
    await schedulePost(id, date);
    const post = await prisma.post.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt: date },
    });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to schedule post' });
  }
}
