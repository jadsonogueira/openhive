import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

const jwtOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as any };

/** Create an invitation (OWNER/ADMIN only) */
export async function createInvitation(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);
    const { email, role } = req.body;

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Este email já está cadastrado' });
      return;
    }

    // Check if there's already a pending invitation
    const pendingInvite = await prisma.invitation.findFirst({
      where: { email, ownerId, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      res.status(409).json({ success: false, error: 'Já existe um convite pendente para este email' });
      return;
    }

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role || 'EDITOR',
        ownerId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({ success: true, data: invitation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create invitation' });
  }
}

/** Accept an invitation and create account */
export async function acceptInvitation(req: AuthRequest | any, res: Response) {
  try {
    const { token, name, password } = req.body;

    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation) {
      res.status(404).json({ success: false, error: 'Convite não encontrado' });
      return;
    }
    if (invitation.usedAt) {
      res.status(400).json({ success: false, error: 'Este convite já foi utilizado' });
      return;
    }
    if (invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Este convite expirou' });
      return;
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Este email já está cadastrado' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          password: hashed,
          name,
          role: invitation.role,
          ownerId: invitation.ownerId,
        },
        select: { id: true, email: true, name: true, role: true },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const jwtToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, jwtOptions);

    res.status(201).json({ success: true, data: { user, token: jwtToken } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to accept invitation' });
  }
}

/** List team members */
export async function listMembers(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);

    const [owner, members] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { ownerId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    res.json({ success: true, data: [owner, ...members] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list members' });
  }
}

/** List pending invitations */
export async function listInvitations(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);

    const invitations = await prisma.invitation.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invitations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list invitations' });
  }
}

/** Update a member's role (OWNER only) */
export async function updateMemberRole(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);
    const memberId = req.params.id as string;
    const { role } = req.body;

    if (memberId === ownerId) {
      res.status(400).json({ success: false, error: 'Não é possível alterar o papel do proprietário' });
      return;
    }

    const member = await prisma.user.findFirst({ where: { id: memberId, ownerId } });
    if (!member) {
      res.status(404).json({ success: false, error: 'Membro não encontrado' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update member role' });
  }
}

/** Remove a member (OWNER only) */
export async function removeMember(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);
    const memberId = req.params.id as string;

    if (memberId === ownerId) {
      res.status(400).json({ success: false, error: 'Não é possível remover o proprietário' });
      return;
    }

    const member = await prisma.user.findFirst({ where: { id: memberId, ownerId } });
    if (!member) {
      res.status(404).json({ success: false, error: 'Membro não encontrado' });
      return;
    }

    await prisma.user.delete({ where: { id: memberId } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to remove member' });
  }
}

/** Delete/revoke an invitation */
export async function deleteInvitation(req: AuthRequest, res: Response) {
  try {
    const ownerId = await resolveOwnerId(req.userId!);
    const invitationId = req.params.id as string;

    const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, ownerId } });
    if (!invitation) {
      res.status(404).json({ success: false, error: 'Convite não encontrado' });
      return;
    }

    await prisma.invitation.delete({ where: { id: invitationId } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete invitation' });
  }
}

/** Get invitation details by token (public - for accept page) */
export async function getInvitationByToken(req: any, res: Response) {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Convite não encontrado' });
      return;
    }

    const expired = invitation.expiresAt < new Date();
    const used = !!invitation.usedAt;

    res.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        ownerName: invitation.owner.name || invitation.owner.email,
        expired,
        used,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get invitation' });
  }
}
