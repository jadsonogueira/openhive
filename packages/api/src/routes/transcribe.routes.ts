import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { getSetting } from '../helpers/getSetting';

const GEMINI_MODEL = 'gemini-2.5-flash';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = await getSetting('NANO_BANANA_API_KEY');
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'Gemini API key nao configurada.' });
      return;
    }

    const audioBuffer = req.body as Buffer;
    if (!audioBuffer || audioBuffer.length < 100) {
      res.status(400).json({ success: false, error: 'Audio vazio.' });
      return;
    }

    const contentType = req.headers['content-type'] || 'audio/webm';
    const base64Audio = audioBuffer.toString('base64');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: contentType,
                data: base64Audio,
              },
            },
            {
              text: 'Transcreva este audio em portugues. Retorne apenas o texto transcrito, sem timestamps, sem comentarios, sem formatacao extra. Se nao houver fala, retorne vazio.',
            },
          ],
        }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[Transcribe] Gemini error:', geminiRes.status, errBody.slice(0, 300));
      res.status(500).json({ success: false, error: 'Falha na transcricao.' });
      return;
    }

    const data = (await geminiRes.json()) as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    res.json({ success: true, data: { text } });
  } catch (err: any) {
    console.error('[Transcribe] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
