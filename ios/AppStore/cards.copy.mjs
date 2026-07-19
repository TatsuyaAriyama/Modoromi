// Copy for the App Store marketing cards, in both listing languages.
//
// Kept apart from the layout so a wording change never means touching the
// design, and so the two languages sit side by side where they can be read
// against each other.
//
// `hi` marks the one phrase per headline that carries the card's idea. The
// layout decides how to mark it (colour, or a pill) — the copy only says
// which words earn it.

export const COPY = {
  ja: {
    brand: 'MADOROMI',
    c1: {
      head: ['今夜の眠りが、', '明日の{hi}になる。'],
      hi: '思考',
      sub: ['眠った長さ・質・リズムから、', '今日の思考コンディションをひとつの数字に。'],
    },
    c2: {
      head: ['夜のかたちが、', '{hi}でわかる。'],
      hi: 'ひと目',
      sub: ['就寝から起床までを、２４時間の軌道にひと巻き。弧の長さが、そのま', 'ま夜の長さです。'],
    },
    c3: {
      head: ['眠った時刻が、', 'そのまま{hi}になる。'],
      hi: '流れ',
      sub: ['帯の位置は、その夜の就寝と起床。', '明るい帯ほど、よく眠れた夜です。'],
      legend: {
        shallow: '浅かった夜',
        deep: 'よく眠れた夜',
        axis: ['右にずれた夜ほど、', '夜ふかしした夜です。'],
      },
    },
    c4: {
      head: ['あとは、{hi}。'],
      hi: 'おやすみ',
      sub: ['ひと呼吸ととのえて、眠りにつくだけ。', '眠っているあいだ、画面は何ひとつ動きません。'],
    },
  },

  en: {
    brand: 'MADOROMI',
    c1: {
      head: ['Tonight’s sleep becomes', 'tomorrow’s {hi}.'],
      hi: 'thinking',
      sub: ['Duration, quality and rhythm, read back', 'as one number for the day ahead.'],
    },
    c2: {
      head: ['The shape of a night,', 'at {hi}.'],
      hi: 'a glance',
      sub: ['Bed to wake, wound once around a 24-hour orbit.', 'The length of the arc is the length of the night.'],
    },
    c3: {
      head: ['When you slept,', 'drawn as a {hi}.'],
      hi: 'current',
      sub: ['Each band sits at its true clock position.', 'The brighter the band, the better the night.'],
      legend: {
        shallow: 'A shallow night',
        deep: 'A night slept well',
        axis: ['The further right a band sits,', 'the later you went to bed.'],
      },
    },
    c4: {
      head: ['Then simply: {hi}.'],
      hi: 'good night',
      sub: ['Settle one breath, and sleep.', 'While you sleep, nothing on screen moves.'],
    },
  },
};
