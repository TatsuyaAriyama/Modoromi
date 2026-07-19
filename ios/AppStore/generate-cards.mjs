// App Store marketing cards for Madoromi.
//
// Two phases in one run:
//   1. Seed the production build with believable data and capture the four
//      app screens each card is built around, per language.
//   2. Compose those shots into the four marketing cards, per language, at
//      each App Store size.
//
// Sizes are the ones App Store Connect actually accepts. The previous cards
// were 1290x2796 — the iPhone 15 Pro Max's native resolution, which reads
// like the right number and is rejected on upload. 6.9" wants 1320x2868 and
// 6.5" wants 1284x2778, so every card is laid out twice rather than scaled:
// scaling between those two would squash the art by ~0.4% and soften every
// hairline the design is built out of.
//
// Usage:
//   npm run build
//   npm run preview -- --port 4173 &
//   node ios/AppStore/generate-cards.mjs
//   node ios/AppStore/generate-cards.mjs --lang=ja --size=69
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { COPY } from './cards.copy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4173/';
const SHOTS = path.join(HERE, '.card-shots'); // intermediate, not committed

const SIZES = {
  69: { w: 1320, h: 2868 }, // iPhone 6.9"
  65: { w: 1284, h: 2778 }, // iPhone 6.5"
};

const args = new Map(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const langs = args.get('lang') ? [args.get('lang')] : ['ja', 'en'];
const sizes = args.get('size') ? [args.get('size')] : Object.keys(SIZES);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────────────────────────────────────────────
   Phase 1 · the app screens
   ──────────────────────────────────────────────────────────── */

/**
 * A week that adds up to the numbers the cards actually show: 7h09m average,
 * quality 75, and a most-recent night of 7h42m — twelve minutes past a 7h30m
 * goal, which is the line the home screen reads out.
 */
function buildSeed(lang) {
  const nights = [
    { d: 0, dur: 462, mood: 'fresh', q: 86, subj: 4 },
    { d: 1, dur: 430, mood: 'normal', q: 80, subj: 4 },
    { d: 2, dur: 390, mood: 'groggy', q: 64, subj: 2 },
    { d: 3, dur: 468, mood: 'fresh', q: 88, subj: 4 },
    { d: 4, dur: 440, mood: 'normal', q: 76, subj: 3 },
    { d: 5, dur: 420, mood: 'normal', q: 72, subj: 3 },
    { d: 6, dur: 393, mood: 'groggy', q: 58, subj: 2 },
    { d: 7, dur: 455, mood: 'fresh', q: 81, subj: 4 },
    { d: 8, dur: 438, mood: 'normal', q: 73, subj: 3 },
    { d: 9, dur: 402, mood: 'groggy', q: 61, subj: 2 },
    { d: 10, dur: 451, mood: 'fresh', q: 80, subj: 4 },
    { d: 11, dur: 467, mood: 'normal', q: 79, subj: 4 },
    { d: 12, dur: 444, mood: 'normal', q: 75, subj: 3 },
    { d: 13, dur: 459, mood: 'fresh', q: 82, subj: 4 },
  ];

  const today = new Date();
  let idn = 2000;
  const sessions = nights.map((n) => {
    const wake = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(),
      7, (n.d % 3) * 3 - 3, 0,
    );
    wake.setDate(wake.getDate() - n.d);
    const start = new Date(wake.getTime() - n.dur * 60000);
    return {
      id: 'c' + idn++,
      startedAt: start.toISOString(),
      endedAt: wake.toISOString(),
      durationMin: n.dur,
      mood: n.mood,
      subjective: n.subj,
      qualityScore: n.q,
    };
  });

  // Two alarms, so the alarm card shows a weekday/weekend pair rather than a
  // lone row with an empty column beside it.
  const alarms = [
    {
      id: 'ca1', time: '07:00', repeatDays: [1, 2, 3, 4, 5],
      sound: 'chime', snoozeEnabled: true, snoozeMinutes: 5, enabled: true,
    },
    {
      id: 'ca2', time: '09:00', repeatDays: [0, 6],
      sound: 'chime', snoozeEnabled: true, snoozeMinutes: 5, enabled: true,
    },
  ];

  const settings = {
    lang,
    theme: 'night',
    targetDurationMin: 450,
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

/** The four screens, at the phone frame's own scale (390pt wide @3x). */
async function captureShots(browser, lang) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await page.evaluateOnNewDocument((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, buildSeed(lang));

  mkdirSync(SHOTS, { recursive: true });

  async function shot(name, prep) {
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await sleep(600);
    if (prep) await prep();
    await sleep(700);
    await page.screenshot({ path: path.join(SHOTS, `${lang}-${name}.png`) });
  }

  await shot('tonight');
  await shot('orbit', async () => {
    await page.evaluate(() => document.querySelectorAll('.tabbar .tab')[1]?.click());
  });
  await shot('river', async () => {
    await page.evaluate(() => document.querySelectorAll('.tabbar .tab')[2]?.click());
    await sleep(500);
    // English insights run two lines longer than Japanese, so the last one
    // tucks ~8px behind the floating dock. Nudge to the bottom (a no-op when
    // the screen already fits, as it does in Japanese) so no line is clipped.
    await page.evaluate(() => {
      // The frame has overflow:visible; the document itself is the scroller.
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
  });
  await shot('winddown', async () => {
    await page.evaluate(() => document.querySelector('.moon-dome')?.click());
    await sleep(1300);
  });

  await page.close();
}

/* ────────────────────────────────────────────────────────────
   Phase 2 · the cards
   ──────────────────────────────────────────────────────────── */

const dataUri = (name) =>
  'data:image/png;base64,' +
  readFileSync(path.join(SHOTS, `${name}.png`)).toString('base64');

/** `{hi}` in a headline line becomes the marked span the card style defines. */
const mark = (line, hi, cls) =>
  line.replace('{hi}', `<span class="${cls}">${hi}</span>`);

const EYE = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor"
  stroke-width="7" stroke-linecap="round">
  <path d="M18 46 Q50 68 82 46"/><line x1="16" y1="49" x2="9" y2="59"/>
  <line x1="33" y1="61" x2="29" y2="72"/><line x1="50" y1="65" x2="50" y2="77"/>
  <line x1="67" y1="61" x2="71" y2="72"/><line x1="84" y1="49" x2="91" y2="59"/>
</svg>`;

const brand = (copy, withMark = false) =>
  `<div class="brand">${withMark ? EYE : ''}${copy.brand}</div>`;

const phone = (lang, shot, zoom) => `
  <div style="zoom:${zoom}"><div class="phone">
    <div class="phone-inner">
      <div class="status">
        <span>1:25</span>
        <div class="island"></div>
        <div class="icons">
          <svg width="18" height="13" viewBox="0 0 18 13" fill="currentColor">
            <rect x="0" y="9" width="3" height="4" rx="1"/><rect x="5" y="6" width="3" height="7" rx="1"/>
            <rect x="10" y="3" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="13" rx="1"/>
          </svg>
          <svg width="17" height="13" viewBox="0 0 17 13" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round">
            <path d="M1.5 4.2a11 11 0 0 1 14 0"/><path d="M4.4 7.3a7 7 0 0 1 8.2 0"/>
            <circle cx="8.5" cy="10.8" r="1.1" fill="currentColor" stroke="none"/>
          </svg>
          <span class="bat"></span>
        </div>
      </div>
      <img src="${dataUri(`${lang}-${shot}`)}" alt="">
    </div>
  </div></div>`;

/**
 * The ambient sky, drawn to the card rather than to the app's 440x900 box.
 * Deterministic — the same table every render, so re-running the generator
 * never quietly reshuffles the background of an already-approved card.
 */
const SKY_STARS = [
  [28, 54, 1.1, 0.5], [96, 22, 0.7, 0.3], [148, 88, 1.3, 0.55], [212, 40, 0.8, 0.35],
  [268, 106, 1, 0.45], [332, 30, 1.2, 0.5], [396, 76, 0.7, 0.3], [62, 132, 0.9, 0.4],
  [178, 156, 0.7, 0.28], [246, 182, 1.1, 0.42], [304, 148, 0.8, 0.32], [412, 168, 1, 0.38],
  [20, 208, 0.8, 0.3], [124, 232, 1.2, 0.4], [196, 268, 0.7, 0.25], [286, 244, 0.9, 0.33],
  [368, 292, 1.1, 0.36], [54, 306, 0.7, 0.24], [148, 344, 0.9, 0.3], [232, 372, 0.7, 0.22],
  [318, 356, 1, 0.3], [408, 404, 0.8, 0.24], [34, 396, 1, 0.28], [116, 448, 0.7, 0.2],
  [204, 470, 0.9, 0.24], [292, 434, 0.7, 0.2], [376, 496, 0.8, 0.22], [70, 512, 0.8, 0.2],
  [166, 556, 0.7, 0.18], [258, 588, 0.9, 0.2], [344, 552, 0.7, 0.16], [420, 604, 0.8, 0.18],
  [42, 628, 0.7, 0.16], [132, 668, 0.8, 0.16], [224, 704, 0.7, 0.14], [312, 660, 0.8, 0.15],
  [398, 726, 0.7, 0.13], [88, 754, 0.7, 0.12], [268, 800, 0.8, 0.12], [356, 842, 0.7, 0.1],
];

function sky(w, h, tone) {
  const star = tone === 'dark' ? '#cfc6f4' : 'transparent';
  const ring = tone === 'dark' ? 'rgba(207,198,244,.10)' : 'rgba(22,16,31,.06)';
  const kx = w / 440, ky = h / 900;
  let out =
    `<circle cx="${392 * kx}" cy="${150 * ky}" r="${128 * kx}" fill="none" stroke="${ring}" stroke-width="2"/>` +
    `<circle cx="${392 * kx}" cy="${150 * ky}" r="${196 * kx}" fill="none" stroke="${ring}" stroke-width="2" opacity=".55"/>`;
  for (const [x, y, r, o] of SKY_STARS) {
    out += `<circle cx="${x * kx}" cy="${y * ky}" r="${r * 2.4}" fill="${star}" opacity="${o}"/>`;
  }
  return `<svg class="sky" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${out}</svg>`;
}

function buildHtml(lang, w, h) {
  const c = COPY[lang];
  const ja = lang === 'ja';

  // English runs longer per line and has no vertical mode, so it gets its own
  // headline scale and its own layout for card 2. Everything else is shared.
  const headSize = ja ? Math.round(w * 0.0775) : Math.round(w * 0.069);
  const subSize = Math.round(w * 0.0256);

  const c1 = `
    <div class="card" id="c1" style="background:var(--paper); color:var(--ink)">
      ${sky(w, h, 'paper')}
      <div class="stage" style="margin-bottom:${Math.round(h * 0.027)}px">
        ${phone(lang, 'tonight', ja ? 2.12 : 2.12)}
      </div>
      <div class="h">${c.c1.head.map((l) => mark(l, c.c1.hi, 'key-ink')).join('<br>')}</div>
      <div class="sub" style="opacity:.6">${c.c1.sub.join('<br>')}</div>
      ${brand(c, false)}
    </div>`;

  const c2 = ja
    ? `
    <div class="card" id="c2" style="background:var(--violet); color:var(--mist);
         padding:${Math.round(h * 0.05)}px ${Math.round(w * 0.071)}px ${Math.round(h * 0.037)}px">
      <div style="flex:1; display:flex; align-items:stretch; justify-content:space-between;
                  gap:30px; min-height:0">
        <div style="align-self:flex-end">${phone(lang, 'orbit', 1.94)}</div>
        <div class="h" style="writing-mode:vertical-rl; align-self:flex-start;
                    font-size:${Math.round(w * 0.0868)}px; letter-spacing:.15em; line-height:1.5">
          ${c2Vertical(c)}
        </div>
      </div>
      <div class="sub" style="opacity:.78">${c.c2.sub.join('')}</div>
      ${brand(c, false)}
    </div>`
    : `
    <div class="card" id="c2" style="background:var(--violet); color:var(--mist);
         padding:${Math.round(h * 0.05)}px ${Math.round(w * 0.071)}px ${Math.round(h * 0.037)}px">
      <div class="h">${c.c2.head.map((l) => mark(l, c.c2.hi, 'pill pill-mist')).join('<br>')}</div>
      <div class="sub" style="opacity:.78">${c.c2.sub.join('<br>')}</div>
      <div class="stage" style="margin-top:${Math.round(h * 0.012)}px">
        ${phone(lang, 'orbit', 2.0)}
      </div>
      ${brand(c, false)}
    </div>`;

  const c3 = `
    <div class="card" id="c3" style="background:var(--mint-pale); color:var(--ink);
         padding:${Math.round(h * 0.053)}px ${Math.round(w * 0.071)}px ${Math.round(h * 0.037)}px">
      <div class="h">${c.c3.head.map((l) => mark(l, c.c3.hi, 'pill pill-violet')).join('<br>')}</div>
      <div class="sub" style="opacity:.6">${c.c3.sub.join('<br>')}</div>
      <div style="flex:1; display:flex; align-items:center; gap:${Math.round(w * 0.034)}px;
                  min-height:0; margin-top:${Math.round(h * 0.014)}px">
        ${phone(lang, 'river', 1.84)}
        <div style="flex:1; min-width:0; display:flex; flex-direction:column;
                    gap:${Math.round(h * 0.019)}px">
          <div>
            <div style="height:36px; border-radius:18px; background:var(--violet); opacity:.4; width:74%"></div>
            <div class="legend">${c.c3.legend.shallow}</div>
          </div>
          <div>
            <div style="height:36px; border-radius:18px; background:var(--violet); width:92%"></div>
            <div class="legend">${c.c3.legend.deep}</div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:${Math.round(w * 0.0178)}px;
                        font-family:var(--mono); opacity:.45; margin-bottom:12px">
              <span>21</span><span>0</span><span>3</span><span>6</span><span>9</span>
            </div>
            <div style="height:2px; background:var(--ink); opacity:.18"></div>
            <div class="legend" style="line-height:1.75">${c.c3.legend.axis.join('<br>')}</div>
          </div>
        </div>
      </div>
      ${brand(c, false)}
    </div>`;

  const c4 = `
    <div class="card" id="c4" style="background:var(--black); color:var(--mist)">
      ${sky(w, h, 'dark')}
      <div class="sky" style="z-index:0">
        <div style="position:absolute; left:50%; bottom:${-Math.round(h * 0.107)}px;
                    transform:translateX(-50%); width:${Math.round(w * 1.318)}px;
                    height:${Math.round(h * 0.304)}px;
                    border-radius:${Math.round(w * 1.318)}px ${Math.round(w * 1.318)}px 0 0;
                    background:var(--violet)"></div>
        <div style="position:absolute; left:50%; bottom:${-Math.round(h * 0.12)}px;
                    transform:translateX(-50%); width:${Math.round(w * 1.374)}px;
                    height:${Math.round(h * 0.317)}px;
                    border-radius:${Math.round(w * 1.374)}px ${Math.round(w * 1.374)}px 0 0;
                    border:2px solid rgba(207,198,244,.18); border-bottom:none"></div>
      </div>
      <div class="h">${c.c4.head.map((l) => mark(l, c.c4.hi, 'key')).join('<br>')}</div>
      <div class="sub">${c.c4.sub.join('<br>')}</div>
      <div class="stage" style="margin-top:${Math.round(h * 0.017)}px">
        ${phone(lang, 'winddown', 2.06)}
      </div>
    </div>`;

  return `<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #222; }
  :root {
    --black:#0a0712; --violet:#5b48c8; --violet-bright:#6d5ae0; --violet-deep:#3b2d80;
    --lavender:#cfc6f4; --mist:#f3f0fb; --paper:#ece7f6; --mint-pale:#dcefe3;
    --mint:#a8e6c8; --ink:#16101f;
    --mincho:"Hiragino Mincho ProN","Yu Mincho",serif;
    --sans:"Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;
    --mono:"SF Mono","SFMono-Regular",ui-monospace,Menlo,monospace;
  }
  .card {
    position: relative;
    width: ${w}px; height: ${h}px;
    overflow: hidden;
    display: flex; flex-direction: column;
    padding: ${Math.round(h * 0.043)}px ${Math.round(w * 0.0775)}px ${Math.round(h * 0.0415)}px;
    font-family: var(--sans);
    -webkit-font-smoothing: antialiased;
    margin: 0 auto 40px;
  }
  .card > * { position: relative; z-index: 1; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
  .h {
    font-family: var(--mincho); font-weight: 500;
    font-size: ${headSize}px; line-height: ${ja ? 1.46 : 1.3};
    letter-spacing: ${ja ? '0.02em' : '0'};
  }
  .sub {
    font-size: ${subSize}px; line-height: 1.95; letter-spacing: 0.02em;
    opacity: .7; margin-top: ${Math.round(h * 0.0093)}px;
  }
  .legend { font-size: ${Math.round(w * 0.0225)}px; margin-top: 16px; opacity: .62; }
  .key { color: var(--lavender); }
  .key-ink { color: var(--violet); }
  .pill { display: inline-block; border-radius: 999px; padding: 0.04em 0.34em 0.09em; }
  .pill-mist { background: var(--mist); color: var(--violet-deep); }
  .pill-violet { background: var(--violet); color: var(--mist); }
  .brand {
    display: flex; align-items: center; gap: 16px;
    font-size: ${Math.round(w * 0.0217)}px; letter-spacing: 0.24em; opacity: .5;
    margin-top: ${Math.round(h * 0.0122)}px;
  }
  .brand svg { width: ${Math.round(w * 0.0326)}px; height: ${Math.round(w * 0.0326)}px; }

  .phone { width: 390px; background: #000; border-radius: 58px; padding: 11px; flex: 0 0 auto; }
  .phone-inner { border-radius: 47px; overflow: hidden; }
  .status {
    height: 46px; position: relative; display: flex; align-items: center;
    justify-content: space-between; padding: 0 30px 4px;
    background: #0a0712; color: #efeafa; font-size: 15px; font-weight: 600;
  }
  .island {
    position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    width: 108px; height: 30px; background: #000; border-radius: 999px;
  }
  .status .icons { display: flex; align-items: center; gap: 7px; }
  .bat { width: 26px; height: 13px; border: 1.6px solid currentColor; border-radius: 4px; position: relative; }
  .bat::after { content:''; position:absolute; inset:2px; right:6px; background:currentColor; border-radius:1px; }
  .bat::before { content:''; position:absolute; right:-4px; top:4px; width:2px; height:5px;
                 background:currentColor; border-radius:0 2px 2px 0; }
  .phone img { display: block; width: 390px; }
  .sky { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
</style>
${c1}${c2}${c3}${c4}`;
}

/** Vertical Japanese: the pill has to be a rounded capsule along the column. */
function c2Vertical(c) {
  return c.c2.head
    .map((l) => l.replace('{hi}', `<span class="pill pill-mist" style="border-radius:200px">${c.c2.hi}</span>`))
    .join('<br>');
}

/* ────────────────────────────────────────────────────────────
   Run
   ──────────────────────────────────────────────────────────── */

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
});

for (const lang of langs) {
  console.log(`capturing app screens · ${lang}`);
  await captureShots(browser, lang);
}

for (const lang of langs) {
  for (const size of sizes) {
    const { w, h } = SIZES[size];
    const out = path.join(HERE, 'cards', `${lang}-${size}`);
    mkdirSync(out, { recursive: true });

    const html = buildHtml(lang, w, h);
    const htmlPath = path.join(SHOTS, `cards-${lang}-${size}.html`);
    writeFileSync(htmlPath, html);

    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    await sleep(400);

    const names = ['01-thinking', '02-orbit', '03-river', '04-goodnight'];
    for (let i = 0; i < 4; i++) {
      const el = await page.$(`#c${i + 1}`);
      await el.screenshot({ path: path.join(out, `${names[i]}.png`) });
    }
    await page.close();
    console.log(`  wrote cards/${lang}-${size}  (${w}x${h})`);
  }
}

await browser.close();
console.log('done');
