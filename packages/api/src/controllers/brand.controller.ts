import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

export async function createBrand(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const data = req.body;

    // If marking as default, unset all other defaults
    if (data.isDefault) {
      await prisma.brand.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    // If first brand, make it default automatically
    const count = await prisma.brand.count({ where: { userId } });
    if (count === 0) data.isDefault = true;

    const brand = await prisma.brand.create({
      data: { ...data, userId },
    });
    res.status(201).json({ success: true, data: brand });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create brand' });
  }
}

export async function listBrands(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const items = await prisma.brand.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: { items, total: items.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list brands' });
  }
}

export async function getBrand(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);
    const brand = await prisma.brand.findFirst({ where: { id, userId } });
    if (!brand) { res.status(404).json({ success: false, error: 'Brand not found' }); return; }
    res.json({ success: true, data: brand });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get brand' });
  }
}

export async function getDefaultBrand(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const brand = await prisma.brand.findFirst({
      where: { userId, isDefault: true },
    });
    res.json({ success: true, data: brand });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get default brand' });
  }
}

export async function updateBrand(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, error: 'Brand not found' }); return; }

    // If marking as default, unset all other defaults first
    if (req.body.isDefault === true) {
      await prisma.brand.updateMany({ where: { userId, NOT: { id } }, data: { isDefault: false } });
    }

    const updated = await prisma.brand.update({ where: { id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update brand' });
  }
}

export async function setDefaultBrand(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, error: 'Brand not found' }); return; }

    await prisma.brand.updateMany({ where: { userId }, data: { isDefault: false } });
    const updated = await prisma.brand.update({ where: { id }, data: { isDefault: true } });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to set default brand' });
  }
}

export async function deleteBrand(req: AuthRequest, res: Response) {
  try {
    const id = paramId(req);
    const userId = await resolveOwnerId(req.userId!);

    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, error: 'Brand not found' }); return; }

    await prisma.brand.delete({ where: { id } });

    // If deleted brand was default, promote another to default
    if (existing.isDefault) {
      const next = await prisma.brand.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await prisma.brand.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete brand' });
  }
}
