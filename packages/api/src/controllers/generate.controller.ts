import { Request, Response } from 'express';
import { generateImage } from '../services/nanobana.service';
import { generateCaption, refineSlide } from '../services/caption.service';

export async function generateImageController(req: Request, res: Response) {
  try {
    const { prompt, style, aspectRatio } = req.body;
    const result = await generateImage({ prompt, style, aspectRatio });
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Image generation error:', err.message || err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate image' });
  }
}

export async function generateCaptionController(req: Request, res: Response) {
  try {
    const result = await generateCaption(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate caption' });
  }
}

export async function refineSlideController(req: Request, res: Response) {
  try {
    const result = await refineSlide(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to refine slide' });
  }
}
