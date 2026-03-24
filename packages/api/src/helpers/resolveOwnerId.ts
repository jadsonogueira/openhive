import { prisma } from '../config/database';

/**
 * Resolves the "owner" userId for data queries.
 * - Service tokens → first registered user (OWNER)
 * - Team members (ADMIN/EDITOR/VIEWER) → their ownerId (the OWNER they belong to)
 * - OWNERs → their own id
 */
export async function resolveOwnerId(reqUserId: string): Promise<string> {
  if (reqUserId === 'service') {
    const firstUser = await prisma.user.findFirst({
      where: { role: 'OWNER', ownerId: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!firstUser) throw new Error('No users found - register at least one user first');
    return firstUser.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: reqUserId },
    select: { id: true, role: true, ownerId: true },
  });
  if (!user) throw new Error('User not found');

  // If user is a team member, return owner's id
  if (user.ownerId) return user.ownerId;

  // User is the owner
  return user.id;
}
