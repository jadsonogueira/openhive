export interface TemplateInput {
  title: string;
  subtitle?: string;
  body?: string;
  accent?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  mutedColor?: string;
  fontFamily?: string;
  headingFont?: string;
  bodyFont?: string;
  logoUrl?: string;
  brandName?: string;
  template: string;
  aspectRatio?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  preview: string;
}

export const TEMPLATES: TemplateConfig[] = [
  { id: 'bold-gradient', name: 'Gradiente Bold', description: 'Texto grande com fundo gradiente vibrante', preview: 'BG' },
  { id: 'minimal-dark', name: 'Minimal Dark', description: 'Fundo escuro com texto limpo e elegante', preview: 'MD' },
  { id: 'neon-card', name: 'Neon Card', description: 'Card com brilho neon e fundo escuro', preview: 'NC' },
  { id: 'quote-elegant', name: 'Citacao Elegante', description: 'Aspas grandes com tipografia serif', preview: 'QE' },
  { id: 'stats-impact', name: 'Impacto com Dados', description: 'Numero grande em destaque com contexto', preview: 'SI' },
  { id: 'split-color', name: 'Split Color', description: 'Duas cores divididas com texto centralizado', preview: 'SC' },
];

function getSize(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5': return { width: 1080, height: 1350 };
    default: return { width: 1080, height: 1080 };
  }
}

function logoOverlay(logoUrl: string | undefined, brandName: string | undefined): string {
  if (!logoUrl && !brandName) return '';
  return `
    <div style="position:absolute;bottom:32px;right:32px;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.95);padding:12px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:10;">
      ${logoUrl ? `<img src="${logoUrl}" alt="logo" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" crossorigin="anonymous"/>` : ''}
      ${brandName ? `<span style="font-size:18px;font-weight:700;color:#1a1a2e;font-family:'Inter',sans-serif;">${brandName}</span>` : ''}
    </div>`;
}

export function renderTemplate(input: TemplateInput): string {
  const {
    title,
    subtitle,
    body,
    accent,
    primaryColor,
    secondaryColor,
    logoUrl,
    brandName,
    template,
    aspectRatio = '1:1',
  } = input;

  // Brand colors take priority over accent
  const main = primaryColor || accent || '#6C5CE7';
  const second = secondaryColor || '#E84393';

  const { width, height } = getSize(aspectRatio);
  const overlay = logoOverlay(logoUrl, brandName);

  const templates: Record<string, string> = {
    'bold-gradient': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;background:linear-gradient(135deg,${main},${second});font-family:'Inter',sans-serif;text-align:center;position:relative;">
        <div style="font-size:${title.length > 50 ? 48 : 64}px;font-weight:900;color:white;line-height:1.1;text-shadow:0 4px 20px rgba(0,0,0,0.3);margin-bottom:24px;">${title}</div>
        ${subtitle ? `<div style="font-size:28px;font-weight:500;color:rgba(255,255,255,0.85);line-height:1.4;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:22px;color:rgba(255,255,255,0.7);margin-top:32px;line-height:1.5;max-width:80%;">${body}</div>` : ''}
        ${overlay}
      </div>`,

    'minimal-dark': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;padding:100px;background:#1a1a2e;font-family:'Inter',sans-serif;position:relative;">
        <div style="width:60px;height:4px;background:${main};margin-bottom:40px;border-radius:2px;"></div>
        <div style="font-size:${title.length > 50 ? 44 : 56}px;font-weight:800;color:#ffffff;line-height:1.15;margin-bottom:24px;">${title}</div>
        ${subtitle ? `<div style="font-size:26px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.4;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:20px;color:rgba(255,255,255,0.4);margin-top:40px;line-height:1.6;max-width:85%;">${body}</div>` : ''}
        ${overlay}
      </div>`,

    'neon-card': `
      <div style="width:${width}px;height:${height}px;display:flex;justify-content:center;align-items:center;background:#0a0a0a;font-family:'Inter',sans-serif;position:relative;">
        <div style="width:${width - 160}px;padding:60px;border-radius:24px;border:2px solid ${main};box-shadow:0 0 40px ${main}40,inset 0 0 40px ${main}10;text-align:center;">
          <div style="font-size:${title.length > 50 ? 40 : 52}px;font-weight:800;color:white;line-height:1.15;margin-bottom:20px;text-shadow:0 0 20px ${main}80;">${title}</div>
          ${subtitle ? `<div style="font-size:24px;font-weight:400;color:${main};line-height:1.4;">${subtitle}</div>` : ''}
          ${body ? `<div style="font-size:18px;color:rgba(255,255,255,0.5);margin-top:32px;line-height:1.6;">${body}</div>` : ''}
        </div>
        ${overlay}
      </div>`,

    'quote-elegant': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:100px;background:linear-gradient(180deg,#fafafa,#f0f0f0);font-family:Georgia,serif;text-align:center;position:relative;">
        <div style="font-size:120px;color:${main};line-height:0.5;margin-bottom:40px;opacity:0.3;">&ldquo;</div>
        <div style="font-size:${title.length > 80 ? 36 : 44}px;font-weight:400;color:#2d2d2d;line-height:1.4;font-style:italic;max-width:85%;">${title}</div>
        ${subtitle ? `<div style="font-size:22px;font-weight:700;color:${main};margin-top:40px;text-transform:uppercase;letter-spacing:3px;font-family:'Inter',sans-serif;font-style:normal;">${subtitle}</div>` : ''}
        ${overlay}
      </div>`,

    'stats-impact': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;background:#1a1a2e;font-family:'Inter',sans-serif;text-align:center;position:relative;">
        <div style="font-size:140px;font-weight:900;background:linear-gradient(135deg,${main},${second});-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;">${title}</div>
        ${subtitle ? `<div style="font-size:32px;font-weight:600;color:white;margin-top:24px;line-height:1.3;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:20px;color:rgba(255,255,255,0.5);margin-top:24px;line-height:1.5;max-width:80%;">${body}</div>` : ''}
        ${overlay}
      </div>`,

    'split-color': `
      <div style="width:${width}px;height:${height}px;display:flex;font-family:'Inter',sans-serif;position:relative;">
        <div style="width:50%;height:100%;background:${main};"></div>
        <div style="width:50%;height:100%;background:#1a1a2e;"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;text-align:center;">
          <div style="font-size:${title.length > 50 ? 44 : 58}px;font-weight:900;color:white;line-height:1.1;text-shadow:0 4px 30px rgba(0,0,0,0.5);margin-bottom:20px;">${title}</div>
          ${subtitle ? `<div style="font-size:26px;font-weight:500;color:rgba(255,255,255,0.8);text-shadow:0 2px 10px rgba(0,0,0,0.5);">${subtitle}</div>` : ''}
        </div>
        ${overlay}
      </div>`,
  };

  const html = templates[template] || templates['bold-gradient'];

  return `<!DOCTYPE html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}</style>
</head><body style="margin:0;padding:0;">${html}</body></html>`;
}
