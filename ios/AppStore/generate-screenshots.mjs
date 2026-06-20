// App Store screenshot generator for Madoromi.
//
// Renders the production web build at the iPhone 6.9" size (440x956 @3x =
// 1320x2868 px, App Store compliant) with believable seeded data, and captures
// the key screens to ./screenshots. Re-run whenever the UI or copy changes.
//
// Usage:
//   npm run build                      # produce dist/
//   npm run preview -- --port 4173 &   # serve dist/ on :4173
//   npm i -D puppeteer-core            # one-off (not a project dependency)
//   node ios/AppStore/generate-screenshots.mjs
//
// Output PNGs are flattened RGB (no alpha). For a Japanese set, set
// settings.lang to 'ja' below.
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4173/';
const OUT = '/Users/tatsuya/Desktop/Madoromi/ios/AppStore/screenshots';

// ---- Build believable seed data (relative to today 2026-06-20) ----
const target = 450;
const nights = [
  { d: 0, dur: 458, mood: 'fresh', q: 83, subj: 4, theme: 'Shape the architecture review', note: 'Clear head — start with the hard design call.' },
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

let idn = 1000;
const sessions = nights.map((n) => {
  const wake = new Date(2026, 5, 20, 7, (n.d % 3) * 4 - 4, 0); // ~06:56–07:04
  wake.setDate(wake.getDate() - n.d);
  const end = wake;
  const start = new Date(end.getTime() - n.dur * 60000);
  const s = {
    id: 's' + idn++,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
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
  lang: 'en',
  theme: 'night',
  targetDurationMin: target,
  defaultWakeTime: '07:00',
  bedtimeReminder: true,
  onboarded: true,
  smartAlarm: true,
};

const seed = {
  'CapacitorStorage.madoromi.sessions': JSON.stringify(sessions),
  'CapacitorStorage.madoromi.alarms': JSON.stringify(alarms),
  'CapacitorStorage.madoromi.settings': JSON.stringify(settings),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
});

const page = await browser.newPage();
await page.setViewport({ width: 440, height: 956, deviceScaleFactor: 3 });
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' },
]);
await page.evaluateOnNewDocument((seed) => {
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
}, seed);

async function shot(name, prep) {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await sleep(600);
  if (prep) await prep();
  await sleep(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('captured', name);
}

// 1. Home
await shot('01-home');

// 2. History (3rd tab)
await shot('02-history', async () => {
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tabbar .tab')];
    tabs[2]?.click();
  });
});

// 3. Alarm (2nd tab)
await shot('03-alarm', async () => {
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tabbar .tab')];
    tabs[1]?.click();
  });
});

// 4. Settings (gear icon on home)
await shot('04-settings', async () => {
  await page.evaluate(() => {
    document.querySelector('.home-head .icon-btn')?.click();
  });
});

// 5. Wind-down (CTA hero on home)
await shot('05-winddown', async () => {
  await page.evaluate(() => {
    document.querySelector('.cta-hero')?.click();
  });
  await sleep(1200); // let the breathing visual settle
});

await browser.close();
console.log('done');
