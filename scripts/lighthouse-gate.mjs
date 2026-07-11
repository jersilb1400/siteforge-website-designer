#!/usr/bin/env node
// Real Lighthouse build gate (CI / local). The in-worker quality check
// (src/generate/quality.ts) is a fast proxy that runs on every build; this is
// the authoritative Chrome-driven audit for the "Lighthouse 90+ across all
// categories" success criterion. Run it against a preview/site URL:
//
//   node scripts/lighthouse-gate.mjs http://127.0.0.1:8787/site/<projectId>/
//
// Exits non-zero if any category is below the threshold (default 90).
// Requires: `npm i -D lighthouse chrome-launcher` and a Chrome/Chromium binary
// (set CHROME_PATH; in this repo's cloud env: /opt/pw-browsers/chromium-*/chrome-linux/chrome).

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const url = process.argv[2];
const THRESHOLD = Number(process.env.LH_THRESHOLD || 90);
if (!url) {
  console.error('usage: lighthouse-gate.mjs <url>');
  process.exit(2);
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  chromePath: process.env.CHROME_PATH,
});
try {
  const { lhr } = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error' });
  const cats = lhr.categories;
  const scores = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]));
  console.log('Lighthouse scores:', JSON.stringify(scores, null, 2));
  const failed = Object.entries(scores).filter(([, s]) => s < THRESHOLD);
  if (failed.length) {
    console.error(`FAIL: below ${THRESHOLD}:`, failed.map(([k, s]) => `${k}=${s}`).join(', '));
    process.exit(1);
  }
  console.log(`PASS: all categories >= ${THRESHOLD}`);
} finally {
  await chrome.kill();
}
