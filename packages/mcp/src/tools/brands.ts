import { api } from '../api-client';

export interface CreateBrandInput {
  name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  description?: string;
  voice_tone?: string;
  products?: string[];
  default_hashtags?: string[];
  is_default?: boolean;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {
  brand_id: string;
}

function toApiBody(input: Partial<CreateBrandInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.logo_url !== undefined) body.logoUrl = input.logo_url;
  if (input.primary_color !== undefined) body.primaryColor = input.primary_color;
  if (input.secondary_color !== undefined) body.secondaryColor = input.secondary_color;
  if (input.accent_color !== undefined) body.accentColor = input.accent_color;
  if (input.font_family !== undefined) body.fontFamily = input.font_family;
  if (input.description !== undefined) body.description = input.description;
  if (input.voice_tone !== undefined) body.voiceTone = input.voice_tone;
  if (input.products !== undefined) body.products = input.products;
  if (input.default_hashtags !== undefined) body.defaultHashtags = input.default_hashtags;
  if (input.is_default !== undefined) body.isDefault = input.is_default;
  return body;
}

function toResponse(brand: any) {
  if (!brand) return null;
  return {
    id: brand.id,
    name: brand.name,
    logo_url: brand.logoUrl,
    primary_color: brand.primaryColor,
    secondary_color: brand.secondaryColor,
    accent_color: brand.accentColor,
    font_family: brand.fontFamily,
    description: brand.description,
    voice_tone: brand.voiceTone,
    products: brand.products || [],
    default_hashtags: brand.defaultHashtags || [],
    is_default: brand.isDefault,
  };
}

export async function listBrands() {
  const result = await api.listBrands();
  return {
    brands: (result.items || []).map(toResponse),
    total: result.total,
  };
}

export async function getBrand(input: { brand_id: string }) {
  const brand = await api.getBrand(input.brand_id);
  return toResponse(brand);
}

export async function getDefaultBrand() {
  const brand = await api.getDefaultBrand();
  if (!brand) return { default_brand: null, message: 'Nenhum brand padrao definido' };
  return { default_brand: toResponse(brand) };
}

export async function createBrand(input: CreateBrandInput) {
  const brand = await api.createBrand(toApiBody(input));
  return toResponse(brand);
}

export async function updateBrand(input: UpdateBrandInput) {
  const { brand_id, ...rest } = input;
  const brand = await api.updateBrand(brand_id, toApiBody(rest));
  return toResponse(brand);
}

export async function setDefaultBrand(input: { brand_id: string }) {
  const brand = await api.setDefaultBrand(input.brand_id);
  return toResponse(brand);
}

export async function deleteBrand(input: { brand_id: string }) {
  await api.deleteBrand(input.brand_id);
  return { deleted: true, brand_id: input.brand_id };
}
