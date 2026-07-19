// App Store screenshot generator for Madoromi.
//
// Renders the production web build with believable seeded data and captures
// the key screens to ./screenshots{,-65,-ja,-ja-65}. Re-run whenever the UI
// or copy changes — this is not run in CI, so it drifts silently otherwise.
//
// Usage:
//   npm run build                      # produce dist/
//   npm run preview -- --port 4173 &   # serve dist/ on :4173
//   node ios/AppStore/generate-screenshots.mjs             # all 4 sets
//   node ios/AppStore/generate-screenshots.mjs --size=65   # one size
//   node ios/AppStore/generate-screenshots.mjs --lang=ja   # one language
//
// Output PNGs are flattened RGB (no alpha).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4173/';

// Apple's two required iPhone sizes, both @3x.
const SIZES = {
  69: { width: 440, height: 956 }, // 1320x2868 — iPhone 6.9"
  65: { width: 428, height: 926 }, // 1284x2778 — iPhone 6.5"
};

const args = new Map(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const sizeArg = args.get('size');
const langArg = args.get('lang');
const sizes = sizeArg ? [sizeArg] : Object.keys(SIZES);
const langs = langArg ? [langArg] : ['en', 'ja'];

const COPY = {
  en: {
    theme: 'Shape the architecture review',
    note: 'Clear head — start with the hard design call.',
  },
  ja: {
    theme: '設計レビューの流れを組み立てる',
    note: '頭が冴えている。難しい判断から始める。',
  },
};

// ---- Seed a believable two-week history, anchored to the real "today" so
// the app's own clock never disagrees with what the screenshots show. ----
function buildSeed(lang) {
  const target = 450;
  const copy = COPY[lang];
  const nights = [
    { d: 0, dur: 458, mood: 'fresh', q: 83, subj: 4, theme: copy.theme, note: copy.note },
    { d: 1, dur: 471, mood: 'normal', q: 80, subj: 4 },
    { d: 2, dur: 432, mood: 'normal', q: 74, subj: 3 },
    { d: 3, dur: 489, mood: 'fresh', q: 82, subj: 4 },
    { d: 4, dur: 405, mood: 'groggy', q: 61, subj: 2 },
    { d: 5, dur: 447, mood: 'normal', q: 76, subj: 3 },
    { d: 6, dur: 455, mood: 'fresh', q: 81, subj: 4 },
    { d: 7, dur: 462, mood: 'normal', q: 78, subj: 4 },
    { d: 8, dur: 438, mood: 'normal', q: 73, subj: 3 },
    { d: 9, dur: 392, mood: 'groggy', q: 58, subj: 2 },
    { d: 10, dur: 451, mood: 'fresh', q: 80, subj: 4 },
    { d: 11, dur: 467, mood: 'normal', q: 79, subj: 4 },
    { d: 12, dur: 444, mood: 'normal', q: 75, subj: 3 },
    { d: 13, dur: 459, mood: 'fresh', q: 82, subj: 4 },
  ];

  const today = new Date();
  let idn = 1000;
  const sessions = nights.map((n) => {
    const wake = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(),
      7, (n.d % 3) * 4 - 4, 0,
    );
    wake.setDate(wake.getDate() - n.d);
    const start = new Date(wake.getTime() - n.dur * 60000);
    const s = {
      id: 's' + idn++,
      startedAt: start.toISOString(),
      endedAt: wake.toISOString(),
      durationMin: n.dur,
      mood: n.mood,
      subjective: n.subj,
      qualityScore: n.q,
    };
    if (n.note) s.note = n.note;
    if (n.theme) s.theme = n.theme;
    return s;
  });

  const alarms = [
    {
      id: 'a1',
      time: '07:00',
      repeatDays: [1, 2, 3, 4, 5],
      sound: 'chime',
      snoozeEnabled: true,
      snoozeMinutes: 5,
      enabled: true,
    },
  ];

  const settings = {
    lang,
    theme: 'night',
    targetDurationMin: target,
    defaultWakeTime: '07:00',
    bedtimeReminder: true,
    onboarded: true,
    smartAlarm: true,
  };

  return {
    'CapacitorStorage.madoromi.sessions': JSON.stringify(sessions),
    'CapacitorStorage.madoromi.alarms': JSON.stringify(alarms),
    'CapacitorStorage.madoromi.settings': JSON.stringify(settings),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(size, lang) {
  const dims = SIZES[size];
  const outDirName = `screenshots${lang === 'ja' ? '-ja' : ''}${size === '65' ? '-65' : ''}`;
  const out = path.join(HERE, outDirName);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
  });

  const page = await browser.newPage();
  await page.setViewport({ ...dims, deviceScaleFactor: 3 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await page.evaluateOnNewDocument((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, buildSeed(lang));

  async function shot(name, prep) {
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await sleep(600);
    if (prep) await prep();
    await sleep(700);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(`[${outDirName}]`, 'captured', name);
  }

  await shot('01-home');

  await shot('02-history', async () => {
    await page.evaluate(() => {
      document.querySelectorAll('.tabbar .tab')[2]?.click();
    });
  });

  await shot('03-alarm', async () => {
    await page.evaluate(() => {
      document.querySelectorAll('.tabbar .tab')[1]?.click();
    });
  });

  await shot('04-settings', async () => {
    await page.evaluate(() => {
      document.querySelector('.home-head .icon-btn')?.click();
    });
  });

  await shot('05-winddown', async () => {
    await page.evaluate(() => {
      document.querySelector('.moon-dome')?.click();
    });
    await sleep(1200); // let the breathing visual settle
  });

  await shot('06-share', async () => {
    await page.evaluate(() => {
      document.querySelectorAll('.tabbar .tab')[2]?.click();
    });
    await sleep(500);
    await page.evaluate(() => {
      document.querySelector('.river-row')?.click();
    });
    await sleep(500);
    await page.evaluate((shareLabel) => {
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === shareLabel,
      );
      btn?.click();
    }, lang === 'ja' ? 'カードにして共有' : 'Share as a card');
    await sleep(900); // let the canvas render finish
  });

  await browser.close();
  console.log(`done: ${outDirName}`);
}

for (const size of sizes) {
  for (const lang of langs) {
    await run(size, lang);
  }
}
