import { api } from '../api-client';

export async function generateTemplateImage(input: {
  title: string;
  subtitle?: string;
  body?: string;
  accent?: string;
  template?: string;
  aspect_ratio?: string;
}) {
  const result = (await api.generateTemplate({
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    accent: input.accent,
    template: input.template || 'bold-gradient',
    aspectRatio: input.aspect_ratio || '1:1',
  })) as any;

  return {
    image_url: result.imageUrl,
    template: input.template || 'bold-gradient',
  };
}
