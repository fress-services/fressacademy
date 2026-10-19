// Génère les icônes PNG de l'application à partir des SVG de public/ (rendu par Chromium).
// Usage : npm run icons   (dans le cloud : KOLO_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run icons)
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const ICONS = [
  { source: 'public/icon.svg', output: 'public/pwa-192.png', size: 192 },
  { source: 'public/icon.svg', output: 'public/pwa-512.png', size: 512 },
  { source: 'public/icon-maskable.svg', output: 'public/pwa-maskable-512.png', size: 512 },
  { source: 'public/icon-maskable.svg', output: 'public/apple-touch-icon.png', size: 180 },
];

const executablePath = process.env.KOLO_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  for (const { source, output, size } of ICONS) {
    const svg = await readFile(source, 'utf8');
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: output, omitBackground: true });
    await page.close();
    console.log(`${output} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
