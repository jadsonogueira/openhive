export interface TemplateInput {
  title: string;
  subtitle?: string;
  body?: string;
  accent?: string;
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
  { id: 'bold-gradient', name: 'Gradiente Bold', description: 'Texto grande com fundo gradiente vibrante', preview: '🟣' },
  { id: 'minimal-dark', name: 'Minimal Dark', description: 'Fundo escuro com texto limpo e elegante', preview: '⚫' },
  { id: 'neon-card', name: 'Neon Card', description: 'Card com brilho neon e fundo escuro', preview: '💜' },
  { id: 'quote-elegant', name: 'Citacao Elegante', description: 'Aspas grandes com tipografia serif', preview: '✨' },
  { id: 'stats-impact', name: 'Impacto com Dados', description: 'Numero grande em destaque com contexto', preview: '📊' },
  { id: 'split-color', name: 'Split Color', description: 'Duas cores divididas com texto centralizado', preview: '🎨' },
];

function getSize(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5': return { width: 1080, height: 1350 };
    default: return { width: 1080, height: 1080 };
  }
}

export function renderTemplate(input: TemplateInput): string {
  const { title, subtitle, body, accent = '#6C5CE7', template, aspectRatio = '1:1' } = input;
  const { width, height } = getSize(aspectRatio);

  const templates: Record<string, string> = {
    'bold-gradient': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;background:linear-gradient(135deg,${accent},#E84393);font-family:'Inter',sans-serif;text-align:center;">
        <div style="font-size:${title.length > 50 ? 48 : 64}px;font-weight:900;color:white;line-height:1.1;text-shadow:0 4px 20px rgba(0,0,0,0.3);margin-bottom:24px;">${title}</div>
        ${subtitle ? `<div style="font-size:28px;font-weight:500;color:rgba(255,255,255,0.85);line-height:1.4;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:22px;color:rgba(255,255,255,0.7);margin-top:32px;line-height:1.5;max-width:80%;">${body}</div>` : ''}
      </div>`,

    'minimal-dark': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;padding:100px;background:#1a1a2e;font-family:'Inter',sans-serif;">
        <div style="width:60px;height:4px;background:${accent};margin-bottom:40px;border-radius:2px;"></div>
        <div style="font-size:${title.length > 50 ? 44 : 56}px;font-weight:800;color:#ffffff;line-height:1.15;margin-bottom:24px;">${title}</div>
        ${subtitle ? `<div style="font-size:26px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.4;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:20px;color:rgba(255,255,255,0.4);margin-top:40px;line-height:1.6;max-width:85%;">${body}</div>` : ''}
      </div>`,

    'neon-card': `
      <div style="width:${width}px;height:${height}px;display:flex;justify-content:center;align-items:center;background:#0a0a0a;font-family:'Inter',sans-serif;">
        <div style="width:${width - 160}px;padding:60px;border-radius:24px;border:2px solid ${accent};box-shadow:0 0 40px ${accent}40,inset 0 0 40px ${accent}10;text-align:center;">
          <div style="font-size:${title.length > 50 ? 40 : 52}px;font-weight:800;color:white;line-height:1.15;margin-bottom:20px;text-shadow:0 0 20px ${accent}80;">${title}</div>
          ${subtitle ? `<div style="font-size:24px;font-weight:400;color:${accent};line-height:1.4;">${subtitle}</div>` : ''}
          ${body ? `<div style="font-size:18px;color:rgba(255,255,255,0.5);margin-top:32px;line-height:1.6;">${body}</div>` : ''}
        </div>
      </div>`,

    'quote-elegant': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:100px;background:linear-gradient(180deg,#fafafa,#f0f0f0);font-family:Georgia,serif;text-align:center;">
        <div style="font-size:120px;color:${accent};line-height:0.5;margin-bottom:40px;opacity:0.3;">"</div>
        <div style="font-size:${title.length > 80 ? 36 : 44}px;font-weight:400;color:#2d2d2d;line-height:1.4;font-style:italic;max-width:85%;">${title}</div>
        ${subtitle ? `<div style="font-size:22px;font-weight:700;color:${accent};margin-top:40px;text-transform:uppercase;letter-spacing:3px;font-family:'Inter',sans-serif;font-style:normal;">${subtitle}</div>` : ''}
      </div>`,

    'stats-impact': `
      <div style="width:${width}px;height:${height}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;background:#1a1a2e;font-family:'Inter',sans-serif;text-align:center;">
        <div style="font-size:140px;font-weight:900;background:linear-gradient(135deg,${accent},#E84393);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;">${title}</div>
        ${subtitle ? `<div style="font-size:32px;font-weight:600;color:white;margin-top:24px;line-height:1.3;">${subtitle}</div>` : ''}
        ${body ? `<div style="font-size:20px;color:rgba(255,255,255,0.5);margin-top:24px;line-height:1.5;max-width:80%;">${body}</div>` : ''}
      </div>`,

    'split-color': `
      <div style="width:${width}px;height:${height}px;display:flex;font-family:'Inter',sans-serif;position:relative;">
        <div style="width:50%;height:100%;background:${accent};"></div>
        <div style="width:50%;height:100%;background:#1a1a2e;"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;text-align:center;">
          <div style="font-size:${title.length > 50 ? 44 : 58}px;font-weight:900;color:white;line-height:1.1;text-shadow:0 4px 30px rgba(0,0,0,0.5);margin-bottom:20px;">${title}</div>
          ${subtitle ? `<div style="font-size:26px;font-weight:500;color:rgba(255,255,255,0.8);text-shadow:0 2px 10px rgba(0,0,0,0.5);">${subtitle}</div>` : ''}
        </div>
      </div>`,
  };

  const html = templates[template] || templates['bold-gradient'];

  return `<!DOCTYPE html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}</style>
</head><body style="margin:0;padding:0;">${html}</body></html>`;
}
