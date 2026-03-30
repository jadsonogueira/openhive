import puppeteer from 'puppeteer';
import { renderTemplate, TemplateInput } from './templates';
import { uploadImage } from './storage.service';

let browser: any = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

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

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    const screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    const imageUrl = await uploadImage(screenshot, 'image/png');

    return { imageUrl };
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
