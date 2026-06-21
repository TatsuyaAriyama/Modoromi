// Dev-only: drive the running dev server with seeded data and capture phone-
// sized screenshots of real app screens for the landing page. Uses the system
// Chrome via puppeteer-core (no bundled browser download).
//
//   node scripts/capture-shots.mjs
//
// Requires the dev server on http://localhost:5173 and Google Chrome installed.
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173';
const OUT = 'docs/shots';

const pad = (n) => String(n).padStart(2, '0');
const local = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:00`;

// A fortnight of believable nights ending this morning. Mostly good sleep with
// a couple of short, restless nights so charts, debt and insights have shape.
function seedSessions() {
  const today = new Date('2026-06-21T09:00:00');
  const plans = [
    { dur: 462, mood: 'fresh', q: 86, bed: '23:05', restless: 6, theme: '論文の章立てを整理する' },
    { dur: 438, mood: 'fresh', q: 80, bed: '23:25', restless: 9, note: '寝る前に読書' },
    { dur: 401, mood: 'groggy', q: 64, bed: '24:10', restless: 18 },
    { dur: 471, mood: 'fresh', q: 88, bed: '22:55', restless: 5, theme: '新機能の設計を考える' },
    { dur: 449, mood: 'ok', q: 76, bed: '23:20', restless: 11 },
    { dur: 420, mood: 'ok', q: 72, bed: '23:40', restless: 14 },
    { dur: 365, mood: 'groggy', q: 58, bed: '24:30', restless: 22, note: '締め切り前' },
    { dur: 458, mood: 'fresh', q: 84, bed: '23:00', restless: 7 },
    { dur: 444, mood: 'fresh', q: 82, bed: '23:15', restless: 8, theme: '読書ノートをまとめる' },
    { dur: 432, mood: 'ok', q: 75, bed: '23:35', restless: 12 },
    { dur: 469, mood: 'fresh', q: 87, bed: '22:50', restless: 6 },
    { dur: 410, mood: 'groggy', q: 66, bed: '24:05', restless: 17 },
    { dur: 452, mood: 'fresh', q: 83, bed: '23:10', restless: 9 },
    { dur: 440, mood: 'ok', q: 78, bed: '23:25', restless: 10 },
  ];

  return plans.map((p, i) => {
    const wake = new Date(today);
    wake.setDate(today.getDate() - i);
    wake.setHours(7, 0, 0, 0);
    const started = new Date(wake.getTime() - p.dur * 60000);
    // Spread a handful of movement samples across the night for the graphs.
    const movements = Array.from({ length: p.restless }, (_, k) => ({
      t: Math.round(((k + 1) / (p.restless + 1)) * p.dur),
      magnitude: 0.6 + ((k * 7) % 10) / 10,
    }));
    return {
      id: `seed-${i}`,
      startedAt: local(started),
      endedAt: local(wake),
      durationMin: p.dur,
      mood: p.mood,
      qualityScore: p.q,
      subjective: Math.round(p.q / 20),
      movements,
      ...(p.note ? { note: p.note } : {}),
      ...(p.theme ? { theme: p.theme } : {}),
      ...(i === 3 ? { smartWoke: true } : {}),
    };
  });
}

const SETTINGS = {
  lang: 'ja',
  theme: 'night',
  targetDurationMin: 450,
  defaultWakeTime: '07:00',
  bedtimeReminder: true,
  onboarded: true,
  smartAlarm: true,
  smartWindowMin: 30,
  healthSync: false,
};

const ALARMS = [
  {
    id: 'a1',
    time: '07:00',
    repeatDays: [1, 2, 3, 4, 5],
    sound: 'default',
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // Seed localStorage (Capacitor Preferences web group prefix), then reload.
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(
    (sessions, settings, alarms) => {
      const P = 'CapacitorStorage.';
      localStorage.setItem(P + 'madoromi.sessions', JSON.stringify(sessions));
      localStorage.setItem(P + 'madoromi.settings', JSON.stringify(settings));
      localStorage.setItem(P + 'madoromi.alarms', JSON.stringify(alarms));
    },
    seedSessions(),
    SETTINGS,
    ALARMS,
  );
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.tabbar', { timeout: 8000 });
  await sleep(700); // let fade-in settle

  // 1) Home
  await page.screenshot({ path: `${OUT}/home.png` });

  // 2) History — overview (weekly review, insights, summary)
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.tabbar .tab');
    tabs[tabs.length - 1].click();
  });
  await sleep(700);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  await page.screenshot({ path: `${OUT}/history.png` });

  // 3) History — charts (duration vs target, quality & condition trends)
  await page.evaluate(() => window.scrollTo(0, 560));
  await sleep(500);
  await page.screenshot({ path: `${OUT}/charts.png` });

  await browser.close();
  console.log('captured home.png, history.png, charts.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
