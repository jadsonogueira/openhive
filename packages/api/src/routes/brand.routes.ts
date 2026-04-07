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

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional().nullable(),
  backgroundColor: hexColor.optional().nullable(),
  textColor: hexColor.optional().nullable(),
  mutedColor: hexColor.optional().nullable(),
  fontFamily: z.string().max(100).optional().nullable(),
  headingFont: z.string().max(100).optional().nullable(),
  bodyFont: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  voiceTone: z.string().max(500).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  instagramUrl: z.string().url().optional().nullable().or(z.literal('')),
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
