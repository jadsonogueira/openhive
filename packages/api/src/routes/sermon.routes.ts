import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { resolveOwnerId } from '../helpers/resolveOwnerId';

const router = Router();
router.use(authMiddleware);

// Create a new sermon session
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const { title } = req.body;
    const sermon = await prisma.sermon.create({
      data: { userId, title: title || null, lines: [], status: 'active' },
    });
    res.json({ success: true, data: sermon });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List sermons
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const sermons = await prisma.sermon.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { drafts: true } } },
    });
    res.json({ success: true, data: sermons });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get sermon details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const sermon = await prisma.sermon.findFirst({
      where: { id: req.params.id, userId },
      include: { drafts: { orderBy: { createdAt: 'desc' } } },
    });
    if (!sermon) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: sermon });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update sermon (auto-save lines, change status)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const { lines, status, title } = req.body;
    const data: Record<string, unknown> = {};
    if (lines !== undefined) data.lines = lines;
    if (status) data.status = status;
    if (title !== undefined) data.title = title;

    const sermon = await prisma.sermon.updateMany({
      where: { id: req.params.id, userId },
      data,
    });
    if (sermon.count === 0) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete sermon
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const result = await prisma.sermon.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate content from sermon transcript
router.post('/:id/generate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const sermon = await prisma.sermon.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!sermon) { res.status(404).json({ success: false, error: 'Not found' }); return; }

    const { tone = 'Pastoral', format = 'Carrossel' } = req.body;
    const lines = sermon.lines as Array<{ text: string; timestamp: string }>;
    if (lines.length === 0) {
      res.status(400).json({ success: false, error: 'Nenhum trecho captado nesta pregacao' });
      return;
    }

    const transcript = lines.map((l) => `[${l.timestamp}] ${l.text}`).join('\n\n');

    const { getSetting } = await import('../helpers/getSetting');
    const apiKey = await getSetting('NANO_BANANA_API_KEY');
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'API Key do Gemini nao configurada' });
      return;
    }

    const prompt = `
Voce e um assistente especialista em transformar pregacoes cristas em conteudo para redes sociais.

Objetivo:
Gerar conteudo fiel ao texto original, com clareza biblica, linguagem edificante e adaptacao para redes sociais.

Tom escolhido: ${tone}
Formato escolhido: ${format}

Transcricao:
${transcript}

Regras:
- Nao invente doutrina.
- Seja fiel ao sentido da mensagem.
- Escreva em portugues do Brasil.
- Se o formato for "Carrossel", gere de 5 a 7 slides curtos.
- Se o formato for "Legenda", gere uma legenda pronta com CTA.
- Se o formato for "Frase", gere frases curtas de impacto.
- Se o formato for "Reels", gere um roteiro curto com gancho, desenvolvimento e CTA.

Responda em JSON com o formato:
{"title": "...", "summary": "...", "items": [{"type": "...", "content": "..."}]}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const geminiData = await geminiRes.json() as any;
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error('Gemini nao retornou conteudo');

    const parsed = JSON.parse(responseText);

    // Save drafts to DB
    const draftsToCreate = (parsed.items || []).map((item: any) => ({
      sermonId: sermon.id,
      title: item.type || format,
      format,
      tone,
      content: item.content || '',
    }));

    if (draftsToCreate.length > 0) {
      await prisma.sermonDraft.createMany({ data: draftsToCreate });
    }

    // Return generated content
    const savedDrafts = await prisma.sermonDraft.findMany({
      where: { sermonId: sermon.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { ...parsed, drafts: savedDrafts } });
  } catch (err: any) {
    console.error('[Sermon Generate]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a specific draft
router.delete('/:id/drafts/:draftId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = await resolveOwnerId(req.userId!);
    const sermon = await prisma.sermon.findFirst({ where: { id: req.params.id, userId } });
    if (!sermon) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    await prisma.sermonDraft.delete({ where: { id: req.params.draftId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
