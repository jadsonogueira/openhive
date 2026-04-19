import 'dotenv/config';
import { Bot } from 'grammy';
import { authMiddleware } from './middleware/auth';
import { startCommand } from './commands/start';
import { novopostCommand } from './commands/novopost';
import { gerarCommand } from './commands/gerar';
import { agendarCommand } from './commands/agendar';
import { listarCommand } from './commands/listar';
import { publicarCommand } from './commands/publicar';
import { cancelarCommand } from './commands/cancelar';
import { statusCommand } from './commands/status';
import { tarefasCommand } from './commands/tarefas';
import { projetosCommand } from './commands/projetos';
import { funisCommand } from './commands/funis';
import { clipCommand, clipCortarCommand } from './commands/clip';
import { templateCommand } from './commands/template';
import { handleCallbackQuery } from './callbacks';
import { api } from './api-client';
import { InlineKeyboard } from 'grammy';
import { sendPhoto } from './utils/send-photo';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

const bot = new Bot(token);

// Auth middleware
bot.use(authMiddleware);

// Commands
bot.command('start', startCommand);
bot.command('novopost', novopostCommand);
bot.command('gerar', gerarCommand);
bot.command('agendar', agendarCommand);
bot.command('listar', listarCommand);
bot.command('publicar', publicarCommand);
bot.command('cancelar', cancelarCommand);
bot.command('status', statusCommand);
bot.command('tarefas', tarefasCommand);
bot.command('projetos', projetosCommand);
bot.command('funis', funisCommand);
bot.command('clip', clipCommand);
bot.command('clipcortar', clipCortarCommand);
bot.command('template', templateCommand);

// Callback queries (inline buttons)
bot.on('callback_query:data', handleCallbackQuery);

// Photo from gallery → upload and create post
bot.on('message:photo', async (ctx) => {
  const caption = ctx.message.caption || '';

  await ctx.reply('📸 *Foto recebida!* Fazendo upload e criando post...', { parse_mode: 'Markdown' });

  try {
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];
    const file = await ctx.api.getFile(largest.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Falha ao baixar foto do Telegram');
    const buffer = Buffer.from(await response.arrayBuffer());

    const ext = file.file_path?.split('.').pop() || 'jpg';
    const mimetype = ext === 'png' ? 'image/png' : 'image/jpeg';
    const { imageUrl } = await api.uploadImage(buffer, `photo.${ext}`, mimetype);

    let postCaption = caption;
    let hashtags: string[] = [];

    if (!caption) {
      await ctx.reply('✍️ Gerando legenda com IA...');
      try {
        const result = await api.generateCaption('post com imagem enviada pelo usuario');
        postCaption = result.caption;
        hashtags = result.hashtags;
      } catch {
        postCaption = '';
      }
    }

    const post = (await api.createPost({
      caption: postCaption,
      imageUrl,
      imageSource: 'UPLOAD',
      hashtags,
      source: 'TELEGRAM',
    })) as any;

    const keyboard = new InlineKeyboard()
      .text('✅ Aprovar', `approve_${post.id}`)
      .text('🔄 Nova Imagem', `regen_${post.id}`)
      .row()
      .text('📤 Publicar Agora', `publish_${post.id}`)
      .text('📅 Agendar', `schedule_${post.id}`)
      .row()
      .text('❌ Cancelar', `cancel_${post.id}`);

    const displayCaption = postCaption
      ? `${postCaption}\n\n${hashtags.map((h: string) => `#${h}`).join(' ')}`
      : '📷 Post criado com sua foto';

    await sendPhoto(ctx, imageUrl, {
      caption: displayCaption.slice(0, 1024),
      reply_markup: keyboard,
    });
  } catch (err: any) {
    console.error('[Bot] Photo upload failed:', err.message);
    await ctx.reply(`❌ Erro ao criar post com foto: ${err.message}`);
  }
});

// Free text → interpret as post creation request
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  await ctx.reply(`⏳ *Gerando post sobre:* _${text}_\n\nCriando imagem e legenda com IA... Aguarde.`, { parse_mode: 'Markdown' });

  try {
    const [imageSettled, captionSettled] = await Promise.allSettled([
      api.generateImage(text),
      api.generateCaption(text),
    ]);

    const imageResult = imageSettled.status === 'fulfilled' ? imageSettled.value : null;
    const captionResult = captionSettled.status === 'fulfilled' ? captionSettled.value : null;

    if (imageSettled.status === 'rejected') {
      console.error('[Bot] Image generation failed:', imageSettled.reason?.message);
    }
    if (captionSettled.status === 'rejected') {
      console.error('[Bot] Caption generation failed:', captionSettled.reason?.message);
    }

    if (!imageResult && !captionResult) {
      await ctx.reply('❌ Nao foi possivel gerar imagem nem legenda. Tente novamente em alguns minutos.');
      return;
    }

    const caption = captionResult?.caption || text;
    const hashtags = captionResult?.hashtags || [];

    const post = (await api.createPost({
      caption,
      imageUrl: imageResult?.imageUrl || null,
      hashtags,
      nanoPrompt: text,
      source: 'TELEGRAM',
    })) as any;

    const keyboard = new InlineKeyboard()
      .text('✅ Aprovar', `approve_${post.id}`)
      .text('🔄 Nova Imagem', `regen_${post.id}`)
      .row()
      .text('📤 Publicar Agora', `publish_${post.id}`)
      .text('📅 Agendar', `schedule_${post.id}`)
      .row()
      .text('❌ Cancelar', `cancel_${post.id}`);

    const captionText = `${caption}\n\n${hashtags.map((h: string) => `#${h}`).join(' ')}`;
    let statusMsg = '';
    if (!imageResult) statusMsg = '\n\n⚠️ Imagem indisponivel (IA sobrecarregada). Use "Nova Imagem" para tentar novamente.';

    if (imageResult?.imageUrl) {
      await sendPhoto(ctx, imageResult.imageUrl, {
        caption: (captionText + statusMsg).slice(0, 1024),
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(captionText + statusMsg, { reply_markup: keyboard });
    }
  } catch (err: any) {
    console.error('[Bot] Post generation failed:', err.message);
    await ctx.reply(`❌ Erro ao gerar post: ${err.message}`);
  }
});

bot.catch((err) => {
  console.error('Bot error:', err.message);
});

bot.start({
  onStart: () => console.log('OpenHive Telegram Bot running!'),
}).catch((err) => {
  console.error('Failed to start bot:', err.message);
  console.error('Bot will NOT restart - check TELEGRAM_BOT_TOKEN');
  // Stay alive so Docker doesn't restart loop
  setInterval(() => {}, 60_000);
});
