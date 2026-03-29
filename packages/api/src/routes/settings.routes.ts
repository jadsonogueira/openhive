import { Router } from 'express';
import { z } from 'zod';
import { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { prisma } from '../config/database';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

const router = Router();

const ALLOWED_KEYS = [
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
  'NANO_BANANA_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_ALLOWED_CHAT_IDS',
  'MCP_AUTH_TOKEN',
  'MCP_URL',
];

router.use(authMiddleware);

// GET /api/settings - Get all settings for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const settings = await prisma.setting.findMany({ where: { userId } });

    const NON_SECRET_KEYS = ['MCP_URL', 'TELEGRAM_ALLOWED_CHAT_IDS', 'INSTAGRAM_USER_ID'];
    const masked = settings.map((s) => ({
      key: s.key,
      value: NON_SECRET_KEYS.includes(s.key) ? s.value : (s.value.length > 8 ? '••••••••' + s.value.slice(-4) : '••••'),
      hasValue: s.value.length > 0,
    }));

    res.json({ success: true, data: masked });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// PUT /api/settings - Update a setting
const updateSchema = z.object({
  key: z.string(),
  value: z.string(),
});

router.put('/', validate(updateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const { key, value } = req.body;

    if (!ALLOWED_KEYS.includes(key)) {
      res.status(400).json({ success: false, error: 'Key not allowed' });
      return;
    }

    await prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });

    res.json({ success: true, data: { key, saved: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// DELETE /api/settings/:key - Remove a setting
router.delete('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const key = req.params.key as string;

    await prisma.setting.deleteMany({ where: { userId, key } });
    res.json({ success: true, data: { key, deleted: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
