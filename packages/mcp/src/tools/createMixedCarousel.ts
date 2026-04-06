import { api } from '../api-client';

interface SlideDefinition {
  title: string;
  subtitle?: string;
  template?: string;
}

interface CreateMixedCarouselInput {
  cover_prompt: string;
  slides: SlideDefinition[];
  caption?: string;
  hashtags?: string[];
  aspect_ratio?: '1:1' | '4:5' | '9:16';
  tone?: string;
  scheduled_at?: string;
}

export async function createMixedCarousel(input: CreateMixedCarouselInput) {
  const aspectRatio = input.aspect_ratio || '1:1';
  const images: Array<{ imageUrl: string; order: number; prompt?: string }> = [];

  // Step 1: Generate AI cover (first slide)
  console.log('[MCP mixed_carousel] Generating AI cover...');
  const cover = await api.generateImage({ prompt: input.cover_prompt, aspectRatio });
  images.push({ imageUrl: cover.imageUrl, order: 0, prompt: input.cover_prompt });

  // Step 2: Generate template slides
  console.log(`[MCP mixed_carousel] Generating ${input.slides.length} template slides...`);
  const slideResults = await Promise.allSettled(
    input.slides.map((slide) =>
      api.generateTemplate({
        title: slide.title,
        subtitle: slide.subtitle,
        template: slide.template || 'bold-gradient',
        aspectRatio,
      })
    )
  );

  for (let i = 0; i < slideResults.length; i++) {
    const result = slideResults[i];
    if (result.status === 'fulfilled') {
      images.push({
        imageUrl: result.value.imageUrl,
        order: images.length,
        prompt: input.slides[i].title,
      });
    } else {
      console.error(`[MCP mixed_carousel] Slide ${i + 1} failed:`, result.reason);
    }
  }

  if (images.length < 2) {
    throw new Error(`Carrossel precisa de pelo menos 2 imagens. Apenas ${images.length} gerada(s) com sucesso.`);
  }

  // Step 3: Generate caption if not provided
  let caption = input.caption;
  let hashtags = input.hashtags;
  if (!caption) {
    const topic = input.cover_prompt;
    const result = await api.generateCaption({ topic, tone: input.tone });
    caption = result.caption;
    hashtags = hashtags || result.hashtags;
  }

  // Step 4: Create post
  const post = (await api.createPost({
    caption,
    hashtags,
    source: 'MCP',
    aspectRatio,
    isCarousel: true,
    images,
    ...(input.scheduled_at ? { scheduledAt: input.scheduled_at } : {}),
  })) as any;

  return {
    post_id: post.id,
    caption: post.caption,
    is_carousel: true,
    cover_image: images[0].imageUrl,
    template_slides: images.length - 1,
    total_images: images.length,
    status: post.status,
    scheduled_at: post.scheduledAt || null,
  };
}
