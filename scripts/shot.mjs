// Dev-only screenshot helper for the visual self-review loop.
// Usage: node scripts/shot.mjs <url> <outPath> [width] [height]
import { chromium } from 'playwright';

const [, , url, out, w = '1280', h = '820'] = process.argv;
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <outPath> [width] [height]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // let canvas/animations settle
await page.screenshot({ path: out });
await browser.close();
console.log(`shot -> ${out} (${w}x${h})`);
