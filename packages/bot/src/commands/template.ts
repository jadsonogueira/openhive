import { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { api } from '../api-client';
import { sendPhoto } from '../utils/send-photo';

const TEMPLATES = [
  { id: 'bold-gradient', name: 'Gradiente Bold' },
  { id: 'minimal-dark', name: 'Minimal Dark' },
  { id: 'neon-card', name: 'Neon Card' },
  { id: 'quote-elegant', name: 'Citacao Elegante' },
  { id: 'stats-impact', name: 'Impacto com Dados' },
  { id: 'split-color', name: 'Split Color' },
];

export async function templateCommand(ctx: Context) {
  const text = ctx.message?.text || '';
  const args = text.replace(/^\/template\s*/, '').trim();

  if (!args) {
    const list = TEMPLATES.map((t, i) => `*${i + 1}.* \`${t.id}\` — ${t.name}`).join('\n');
    await ctx.reply(
      `🎨 *Gerar Post com Template*\n\n` +
      `Use: \`/template [nome] [texto]\`\n\n` +
      `📋 *Templates disponiveis:*\n${list}\n\n` +
      `📝 *Exemplos:*\n` +
      `• \`/template bold-gradient 5 dicas de produtividade\`\n` +
      `• \`/template neon-card Lancamento do novo curso\`\n` +
      `• \`/template quote-elegant A persistencia e o caminho\`\n\n` +
      `💡 Nao usa IA — gera imagem direto com HTML/CSS!`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // Parse: first word may be template name, rest is title
  const parts = args.split(' ');
  const templateNames = TEMPLATES.map((t) => t.id);
  let template = 'bold-gradient';
  let title = args;

  if (templateNames.includes(parts[0])) {
    template = parts[0];
    title = parts.slice(1).join(' ');
  }

  if (!title) {
    await ctx.reply('❌ Faltou o texto! Use: `/template [nome] [texto do post]`', { parse_mode: 'Markdown' });
    return;
  }

  // Split title into title + subtitle if there's a | separator
  let subtitle: string | undefined;
  if (title.includes('|')) {
    const [t, s] = title.split('|').map((p) => p.trim());
    title = t;
    subtitle = s;
  }

  await ctx.reply(`⏳ Gerando imagem com template *${template}*...`, { parse_mode: 'Markdown' });

  try {
    const result = await api.generateTemplate({ title, subtitle, template });

    const post = (await api.createPost({
      caption: title + (subtitle ? '\n\n' + subtitle : ''),
      imageUrl: result.imageUrl,
      source: 'TELEGRAM',
    })) as any;

    const keyboard = new InlineKeyboard()
      .text('✅ Aprovar', `approve_${post.id}`)
      .text('🔄 Outro Template', `regen_${post.id}`)
      .row()
      .text('📤 Publicar Agora', `publish_${post.id}`)
      .text('📅 Agendar', `schedule_${post.id}`)
      .row()
      .text('❌ Cancelar', `cancel_${post.id}`);

    await sendPhoto(ctx, result.imageUrl, {
      caption: `Template: ${template} | ${title}${subtitle ? ' | ' + subtitle : ''}`.slice(0, 1024),
      reply_markup: keyboard,
    });
  } catch (err: any) {
    await ctx.reply(`❌ Erro ao gerar template: ${err.message}`);
  }
}
