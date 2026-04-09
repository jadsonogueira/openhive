import { renderTemplate, TemplateInput } from './templates';
import { uploadImage } from './storage.service';

const RENDERER_URL = process.env.RENDERER_URL || 'http://renderer:3003';

function getSize(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5': return { width: 1080, height: 1350 };
    default: return { width: 1080, height: 1080 };
  }
}

export async function renderTemplateToImage(input: TemplateInput): Promise<{ imageUrl: string }> {
  const html = renderTemplate(input);
  const { width, height } = getSize(input.aspectRatio || '1:1');

  const res = await fetch(`${RENDERER_URL}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, width, height }),
  });

  const data = await res.json() as any;
  if (!data.success) throw new Error(data.error || 'Render failed');

  const buffer = Buffer.from(data.image, 'base64');
  const imageUrl = await uploadImage(buffer, 'image/png');
  return { imageUrl };
}

export async function renderHtmlToImage(html: string, width = 1080, height = 1080): Promise<{ imageUrl: string }> {
  const res = await fetch(`${RENDERER_URL}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, width, height }),
  });

  const data = await res.json() as any;
  if (!data.success) throw new Error(data.error || 'Render failed');

  const buffer = Buffer.from(data.image, 'base64');
  const imageUrl = await uploadImage(buffer, 'image/png');
  return { imageUrl };
}

export interface ComposedRenderInput {
  backgroundUrl: string;
  html: string; // raw <body> content (no <html><head>)
  width?: number;
  height?: number;
  overlayOpacity?: number; // 0-1, dark overlay between bg and html for legibility
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
  brandTextColor?: string;
  brandFontFamily?: string;
  brandHeadingFont?: string;
  brandBodyFont?: string;
  brandLogoUrl?: string;
  brandName?: string;
}

/**
 * Compose an HTML/CSS/Tailwind overlay on top of an AI-generated (or any)
 * background image. Brand variables are exposed as CSS custom properties
 * (--brand-primary, --brand-secondary, etc) that the user's HTML can use.
 */
export async function renderComposedToImage(input: ComposedRenderInput): Promise<{ imageUrl: string }> {
  const width = input.width || 1080;
  const height = input.height || 1080;
  const overlayOpacity = Math.max(0, Math.min(1, input.overlayOpacity ?? 0));

  const cssVars: string[] = [];
  if (input.brandPrimaryColor) cssVars.push(`--brand-primary:${input.brandPrimaryColor}`);
  if (input.brandSecondaryColor) cssVars.push(`--brand-secondary:${input.brandSecondaryColor}`);
  if (input.brandAccentColor) cssVars.push(`--brand-accent:${input.brandAccentColor}`);
  if (input.brandTextColor) cssVars.push(`--brand-text:${input.brandTextColor}`);
  if (input.brandFontFamily) cssVars.push(`--brand-font:'${input.brandFontFamily}'`);
  if (input.brandHeadingFont) cssVars.push(`--brand-heading-font:'${input.brandHeadingFont}'`);
  if (input.brandBodyFont) cssVars.push(`--brand-body-font:'${input.brandBodyFont}'`);

  const rootStyle = cssVars.length > 0 ? `:root{${cssVars.join(';')}}` : '';

  const overlayDiv = overlayOpacity > 0
    ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${overlayOpacity});pointer-events:none;z-index:1;"></div>`
    : '';

  const logoBadge = input.brandLogoUrl || input.brandName
    ? `<div style="position:absolute;bottom:32px;right:32px;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.95);padding:12px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:10;">
        ${input.brandLogoUrl ? `<img src="${input.brandLogoUrl}" alt="logo" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" crossorigin="anonymous"/>` : ''}
        ${input.brandName ? `<span style="font-size:18px;font-weight:700;color:#1a1a2e;font-family:'Inter',sans-serif;">${input.brandName}</span>` : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Sora:wght@300;400;600;700;800;900&family=Space+Grotesk:wght@300;400;600;700&family=Outfit:wght@300;400;600;700;800;900&family=DM+Sans:wght@300;400;600;700&family=Manrope:wght@300;400;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;600;700;800&family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Raleway:wght@300;400;600;700;800;900&family=Playfair+Display:wght@400;600;700;900&family=Caveat:wght@400;700&family=Montserrat:wght@300;400;600;700;800;900&family=Urbanist:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  ${rootStyle}
  html,body{width:${width}px;height:${height}px;overflow:hidden;}
  .composed-bg{
    position:absolute;inset:0;
    background-image:url('${input.backgroundUrl}');
    background-size:cover;
    background-position:center;
    z-index:0;
  }
  .composed-content{
    position:absolute;inset:0;z-index:2;
    width:${width}px;height:${height}px;
  }
</style>
</head><body>
<div class="composed-bg"></div>
${overlayDiv}
<div class="composed-content">${input.html}</div>
${logoBadge}
</body></html>`;

  return await renderHtmlToImage(html, width, height);
}
