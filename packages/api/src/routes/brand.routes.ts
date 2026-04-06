import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import {
  createBrand,
  listBrands,
  getBrand,
  getDefaultBrand,
  updateBrand,
  setDefaultBrand,
  deleteBrand,
} from '../controllers/brand.controller';

const router = Router();

const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  fontFamily: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  voiceTone: z.string().max(500).optional().nullable(),
  products: z.array(z.string()).optional(),
  defaultHashtags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

const updateBrandSchema = createBrandSchema.partial();

router.use(authMiddleware);

router.post('/', validate(createBrandSchema), createBrand);
router.get('/', listBrands);
router.get('/default', getDefaultBrand);
router.get('/:id', getBrand);
router.put('/:id', validate(updateBrandSchema), updateBrand);
router.put('/:id/default', setDefaultBrand);
router.delete('/:id', deleteBrand);

export default router;
