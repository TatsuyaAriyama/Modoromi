/**
 * Lightweight, dependency-free i18n. The catalog is a flat map of keys to
 * per-language values (string or a function for interpolation). It is pure —
 * domain code can import {@link translate} without pulling in React.
 *
 * English is the primary language; Japanese is fully supported and selectable
 * from the first-launch screen and Settings.
 */

import type { Lang } from '../domain/types';
export type { Lang };

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
];

export type Params = Record<string, string | number>;
type Tmpl = string | ((p: Params) => string);
interface Msg {
  en: Tmpl;
  ja: Tmpl;
}

/** English plural picker. The catalog has no plural machinery, and
 *  "1 movements" is the kind of defect that survives forever. */
const plural = (n: unknown, one: string, other: string) =>
  Number(n) === 1 ? one : other;

const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const JA_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const messages: Record<string, Msg> = {
  // ── common ──────────────────────────────────────────────
  'common.save': { en: 'Save', ja: '保存' },
  'common.cancel': { en: 'Cancel', ja: 'キャンセル' },
  'common.delete': { en: 'Delete', ja: '削除' },
  'common.close': { en: 'Close', ja: '閉じる' },
  'common.done': { en: 'Done', ja: '完了' },
  'common.back': { en: 'Back', ja: '戻る' },
  'sep.middot': { en: ' · ', ja: '・' },

  // ── tab bar ─────────────────────────────────────────────
  'tab.home': { en: 'Tonight', ja: '今夜' },
  'tab.alarm': { en: 'Alarm', ja: 'アラーム' },
  'tab.history': { en: 'Log', ja: '記録' },

  // ── language ────────────────────────────────────────────
  'lang.title': { en: 'Language', ja: '言語' },

  // ── mood ────────────────────────────────────────────────
  'mood.aria': { en: 'This morning’s condition', ja: '今朝のコンディション' },
  'mood.fresh': { en: 'Fresh', ja: 'すっきり' },
  'mood.normal': { en: 'Okay', ja: 'ふつう' },
  'mood.groggy': { en: 'Groggy', ja: 'だるい' },

  // ── breath cues ─────────────────────────────────────────
  'breath.inhale': { en: 'Breathe in', ja: '吸って' },
  'breath.hold-in': { en: 'Hold', ja: '止めて' },
  'breath.exhale': { en: 'Breathe out', ja: '吐いて' },
  'breath.hold-out': { en: 'Hold', ja: '止めて' },

  // ── alarm sounds ────────────────────────────────────────
  'sound.chime': { en: 'Chime', ja: 'チャイム' },
  'sound.bell': { en: 'Bell', ja: 'ベル' },
  'sound.marimba': { en: 'Marimba', ja: 'マリンバ' },
  'sound.dawn': { en: 'Dawn', ja: '夜明け' },

  // ── TimeDial a11y ───────────────────────────────────────
  'dial.hourUp': { en: 'Increase hour', ja: '時を増やす' },
  'dial.hourDown': { en: 'Decrease hour', ja: '時を減らす' },
  'dial.minUp': { en: 'Increase minute', ja: '分を増やす' },
  'dial.minDown': { en: 'Decrease minute', ja: '分を減らす' },

  // ── charts a11y ─────────────────────────────────────────
  'chart.duration': { en: 'Daily sleep duration', ja: '日別の睡眠時間' },
  'chart.quality': { en: 'Quality-score trend', ja: '質スコアの推移' },
  'chart.movement': { en: 'Body movement through the night', ja: '夜間の体動' },

  // ── body movement (Session detail) ──────────────────────
  'motion.title': { en: 'Body movement', ja: '体動' },
  'motion.count': {
    en: (p) => `${p.count} ${plural(p.count, 'movement', 'movements')}`,
    ja: (p) => `寝返り ${p.count} 回`,
  },
  'motion.still': { en: 'Slept very still', ja: 'とても静かな眠り' },
  'motion.calm': { en: 'Calm, settled sleep', ja: '落ち着いた眠り' },
  'motion.restless': { en: 'A restless night', ja: '少し落ち着かない夜' },

  // ── weekly review (History) ─────────────────────────────
  'review.none': { en: 'No records yet this week', ja: '今週の記録はまだありません' },
  'review.onTarget': { en: 'You’re sleeping close to your goal', ja: '目標どおりの睡眠を保てています' },
  'review.slightlyShort': { en: 'A few nights are falling a little short', ja: '目標にやや届かない夜が続いています' },
  'review.wellShort': { en: 'Sleep is well below your goal', ja: '睡眠が目標を大きく下回っています' },
  'review.qualityUp': { en: 'quality is up from last week', ja: '質は先週より上向き' },
  'review.qualityDown': { en: 'quality is down from last week', ja: '質は先週より下降' },
  'review.qualityFlat': { en: 'quality is similar to last week', ja: '質は先週と同程度' },

  // ── insights ────────────────────────────────────────────
  'insight.duration-quality': {
    en: (p) => `Nights you hit your target tend to score higher (avg +${p.diff})`,
    ja: (p) => `目標どおり眠れた日は、質スコアが高めです（平均 +${p.diff}）`,
  },
  'insight.weekend-drift': {
    en: (p) => `On weekends, bedtime tends to slip about ${p.diff} min later`,
    ja: (p) => `週末は就寝が ${p.diff}分ほど遅くなりがちです`,
  },
  'insight.stillness-quality': {
    en: (p) => `Calmer, stiller nights tend to score higher (avg +${p.diff})`,
    ja: (p) => `静かに眠れた夜は、質スコアが高めです（平均 +${p.diff}）`,
  },
  'insight.rhythm-quality': {
    en: (p) => `Nights near your usual bedtime tend to score higher (avg +${p.diff})`,
    ja: (p) => `いつもの就寝時刻に近い夜は、質スコアが高めです（平均 +${p.diff}）`,
  },

  // ── nap advice ──────────────────────────────────────────
  'nap.idealRecover': {
    en: 'A good window for an afternoon nap to recover a little',
    ja: '午後の仮眠で軽く回復できる時間帯です',
  },
  'nap.idealRefresh': {
    en: 'A short nap now can clear your head',
    ja: '短い仮眠で頭がすっきりしやすい時間帯です',
  },
  'nap.caution': {
    en: 'Keep it short so it won’t affect tonight’s sleep',
    ja: '夜の睡眠に響かないよう、短めに',
  },
  'nap.nightFirst': {
    en: 'Better to prioritize tonight’s sleep right now',
    ja: '今は夜の睡眠を優先するのがおすすめです',
  },
  'nap.morningLight': {
    en: 'Rather than a nap, get some morning light',
    ja: '仮眠よりも、朝の光を浴びるのがおすすめです',
  },

  // ── bedtime reminder (notification) ─────────────────────
  'bedtime.title': { en: 'Time to wind down soon', ja: 'そろそろおやすみの時間です' },
  'bedtime.titleEarly': {
    en: 'Time to wind down soon (a little early, to recover)',
    ja: 'そろそろおやすみの時間です（回復のため少し早め）',
  },
  'bedtime.body': {
    en: 'A guide to reach your target sleep',
    ja: '目標の睡眠時間を確保するための目安です',
  },
  'bedtime.bodyEarly': {
    en: (p) => `To cover your sleep debt, about ${p.amount} earlier than usual`,
    ja: (p) => `睡眠負債のぶん、いつもより${p.amount}早めが目安です`,
  },

  // ── notifications (alarm) ───────────────────────────────
  'notif.wakeTitle': { en: 'Time to wake up', ja: '起床時刻です' },
  'notif.wakeBody': { en: 'Madoromi — good morning', ja: 'Madoromi — おはようございます' },
  'notif.snoozeTitle': { en: 'Time to wake up (snooze)', ja: '起床時刻です（スヌーズ）' },
  'notif.snoozeBody': { en: 'Madoromi', ja: 'Madoromi' },

  // ── backup parse errors (Settings → Import) ─────────────
  'backup.invalid-json': { en: 'Could not read the file as JSON', ja: 'JSONとして読み取れませんでした' },
  'backup.not-object': { en: 'Not a backup file', ja: 'バックアップの形式ではありません' },
  'backup.not-madoromi': { en: 'Not a Madoromi backup', ja: 'Madoromiのバックアップではありません' },
  'backup.unsupported-version': { en: 'This backup is from a newer version of Madoromi', ja: '新しいバージョンのMadoromiで作成されたバックアップです' },
  'backup.sessions-corrupt': { en: 'Sleep records are corrupted', ja: '記録データが壊れています' },
  'backup.sessions-invalid': { en: 'Sleep records contain an invalid entry', ja: '記録データに不正な項目があります' },
  'backup.alarms-corrupt': { en: 'Alarm data is corrupted', ja: 'アラームデータが壊れています' },
  'backup.alarms-invalid': { en: 'Alarm data contains an invalid entry', ja: 'アラームデータに不正な項目があります' },

  // ── common (extended) ───────────────────────────────────
  'common.next': { en: 'Next', ja: '次へ' },
  'common.start': { en: 'Start', ja: 'はじめる' },
  'common.cancel.soft': { en: 'Not now', ja: 'やめる' },
  'common.later': { en: 'Later', ja: 'あとで' },
  'unit.min': { en: (p) => `${p.n} min`, ja: (p) => `${p.n}分` },

  // ── settings & tabs (extended) ──────────────────────────
  'settings.title': { en: 'Settings', ja: '設定' },
  'stat.regularity': { en: 'Regularity', ja: '規則性' },

  // ── thinking condition (Home) ───────────────────────────
  'cond.sharp': { en: 'Sharp', ja: '冴えている' },
  'cond.steady': { en: 'Steady', ja: 'おだやか' },
  'cond.foggy': { en: 'A bit foggy', ja: 'ややぼんやり' },
  'cond.depleted': { en: 'Needs recovery', ja: '要回復' },
  'cond.sharpCopy': { en: 'Your thinking should flow well today.', ja: '思考がよく回りそうな一日です。' },
  'cond.steadyCopy': { en: 'A steady, settled condition today.', ja: '安定したコンディションです。' },
  'cond.foggyCopy': { en: 'Ease in — start with lighter focus.', ja: '無理せず、軽めの集中から始めましょう。' },
  'cond.depletedCopy': { en: 'Prioritize recovery; take an early night.', ja: '回復を優先して。今夜は早めに眠りましょう。' },

  // ── regularity levels ───────────────────────────────────
  'reg.high': { en: 'High', ja: '高い' },
  'reg.medium': { en: 'Average', ja: 'ふつう' },
  'reg.low': { en: 'Variable', ja: 'ばらつき' },

  // ── theme options (Settings) ────────────────────────────
  'theme.auto': { en: 'Auto', ja: '自動' },
  'theme.day': { en: 'Day', ja: 'デイ' },
  'theme.night': { en: 'Night', ja: 'ナイト' },

  // ── Home screen ─────────────────────────────────────────
  'home.greeting': { en: 'Getting ready for sleep', ja: 'おやすみの準備を' },
  'home.condKicker': { en: 'TODAY’S MIND', ja: 'きょうの思考' },
  // Every line on the home screen reads as a full sentence, so nothing needs
  // a label to be understood.
  'home.lastNightOver': {
    en: (p) => `Last night you slept ${p.dur} — ${p.gap} past your goal.`,
    ja: (p) => `昨夜は${p.dur}、目標を${p.gap}こえました。`,
  },
  'home.lastNightUnder': {
    en: (p) => `Last night you slept ${p.dur} — ${p.gap} short of your goal.`,
    ja: (p) => `昨夜は${p.dur}、目標にあと${p.gap}でした。`,
  },
  'home.lastNightExact': {
    en: (p) => `Last night you slept ${p.dur}, right on your goal.`,
    ja: (p) => `昨夜は${p.dur}、ちょうど目標どおりです。`,
  },
  'home.noRecordsLine': {
    en: 'No nights recorded yet — tonight can be the first.',
    ja: 'まだ記録がありません。今夜が最初の一晩です。',
  },
  'home.bedtimeLine': {
    en: (p) => `Sleep by ${p.time} tonight to hit your goal.`,
    ja: (p) => `今夜は${p.time}に眠ると、目標にとどきます。`,
  },
  'home.bedtimeRecoveryLine': {
    en: (p) => `Sleep by ${p.time} tonight — ${p.amount} earlier, to pay down your debt.`,
    ja: (p) => `睡眠負債のぶん、今夜は${p.amount}早い${p.time}に。`,
  },
  'home.theme': { en: 'Today’s thinking theme', ja: '今日の思考テーマ' },
  'home.lastNight': { en: 'Last night', ja: '昨夜のサマリー' },
  'home.vsTarget': { en: 'vs. goal', ja: '目標との差' },
  'home.quality': { en: 'Quality score', ja: '質スコア' },
  'home.noRecords': { en: 'No records yet', ja: 'まだ記録がありません' },
  'home.condition': { en: 'Today’s thinking condition', ja: '今日の思考コンディション' },
  'home.debt7': { en: 'Sleep debt (7d)', ja: '睡眠負債（7日）' },
  'home.suggestedBedtime': { en: 'Suggested bedtime', ja: 'おすすめ就寝' },
  'home.bedtimeReminder': { en: 'Bedtime reminder', ja: '就寝リマインダー' },
  'home.earlierBy': {
    en: (p) => `About ${p.amount} earlier, to cover your sleep debt`,
    ja: (p) => `睡眠負債のぶん、いつもより${p.amount}早めに`,
  },
  'home.morningCheckPending': {
    en: (p) => `Woke ${p.time} · morning check not filled in`,
    ja: (p) => `起床 ${p.time} ・ 朝のチェック未入力`,
  },
  'home.cta': { en: 'Good night', ja: 'おやすみ' },
  'home.setAlarm': { en: 'Set an alarm →', ja: 'アラームを設定する →' },
  'home.nap': { en: 'Take a nap →', ja: '仮眠する →' },

  // ── Morning check ───────────────────────────────────────
  'morning.greeting': { en: 'Good morning', ja: 'おはようございます' },
  'morning.movements': {
    en: (p) => `${p.count} ${plural(p.count, 'movement', 'movements')}`,
    ja: (p) => `寝返り ${p.count} 回`,
  },
  'morning.condition': { en: 'This morning’s condition', ja: '今朝のコンディション' },
  'morning.subjective': { en: 'Sleep quality', ja: '眠りの質' },
  'morning.theme': { en: 'On your mind today', ja: '考えたいこと' },
  'morning.themePlaceholder': { en: 'e.g. outline the project brief', ja: '例：企画の骨子をまとめる' },
  'morning.note': { en: 'Note', ja: 'メモ' },
  'morning.notePlaceholder': { en: 'had a dream / woke in the night, etc.', ja: '夢を見た / 途中で目が覚めた など' },
  'morning.save': { en: 'Save', ja: '保存する' },
  'morning.later': { en: 'Later (log the time only)', ja: 'あとで（時間だけ記録）' },

  // ── Wind-down ───────────────────────────────────────────
  'wind.title': { en: 'Breathe, and let the day go', ja: '深呼吸して、頭をほどく' },
  'wind.ready': { en: 'You’re ready. Good night', ja: '準備ができました。おやすみなさい' },
  'wind.guide': { en: 'Breathe slowly, in time with the circle', ja: '円に合わせて、ゆっくり呼吸しましょう' },
  'wind.start': { en: 'Drift off to sleep', ja: '眠りにつく' },

  // ── Nap ─────────────────────────────────────────────────
  'nap.title': { en: 'Nap', ja: '仮眠' },
  'nap.doneTitle': { en: 'You’re back', ja: 'おかえりなさい' },
  'nap.doneNote': { en: 'Feeling a little clearer?', ja: '少し頭が軽くなりましたか' },
  'nap.wake': { en: 'Wake up', ja: '起きる' },

  // ── Session (asleep) ────────────────────────────────────
  'session.alarm': { en: (p) => `Alarm ${p.time}`, ja: (p) => `アラーム ${p.time}` },
  'session.smartWake': { en: 'Smart wake', ja: 'スマート起床' },
  'session.recording': { en: 'Recording movement', ja: '体動を記録中' },
  'session.keepAwake': { en: 'Keep the screen on', ja: '画面を点けたままにする' },
  'session.holdToWake': { en: 'Press and hold — “I’m up”', ja: '長押しで「起きた」' },
  'session.holdHint': {
    en: 'Hold for about a second, or use “End the night” below.',
    ja: '約1秒長押しします。下の「夜を終える」でも終了できます。',
  },
  'session.endNow': { en: 'End the night', ja: '夜を終える' },
  'session.confirmWake': { en: 'End the night?', ja: '夜を終えますか？' },
  'session.confirmWakeYes': { en: 'Yes, I’m up', ja: 'はい、起きました' },
  'session.wakeTime': { en: 'Time to wake up', ja: '起きる時間です' },
  'session.dismiss': { en: 'Stop & get up', ja: '止めて起きる' },
  'session.snooze': { en: (p) => `Snooze ${p.min} min`, ja: (p) => `スヌーズ ${p.min}分` },

  // ── History ─────────────────────────────────────────────
  'history.week': { en: 'Week', ja: '週' },
  'history.month': { en: 'Month', ja: '月' },
  'history.weeklyReview': { en: 'This week', ja: '今週の振り返り' },
  'history.insights': { en: 'Noticing', ja: '気づき' },
  'history.avgDuration': { en: 'Avg. sleep', ja: '平均睡眠時間' },
  'history.avgQuality': { en: 'Avg. quality', ja: '平均質スコア' },
  'chart.durationTarget': { en: 'Sleep duration (dotted = goal)', ja: '睡眠時間（点線 = 目標）' },
  'chart.qualityTrend': { en: 'Quality-score trend', ja: '質スコアの推移' },
  'chart.conditionTrend': { en: 'Thinking-condition trend', ja: '思考コンディションの推移' },
  'chart.condition': { en: 'Thinking-condition trend over time', ja: '思考コンディションの推移' },
  'history.sessions': { en: 'Sessions', ja: 'セッション' },
  'history.empty': { en: 'No records yet', ja: 'まだ記録がありません' },

  // ── Session detail ──────────────────────────────────────
  'detail.duration': { en: 'Sleep duration', ja: '睡眠時間' },
  'detail.timeRange': { en: 'Time', ja: '時間帯' },
  'detail.condition': { en: 'Condition', ja: 'コンディション' },
  'detail.smartWoke': { en: 'Smart wake ended this a little early', ja: 'スマート起床が少し早めに起こしました' },
  'detail.note': { en: 'Note', ja: 'メモ' },
  'detail.confirmDelete': { en: 'Delete this record?', ja: 'この記録を削除しますか？' },
  'detail.deleteConfirm': { en: 'Delete', ja: '削除する' },
  'detail.delete': { en: 'Delete this record', ja: 'この記録を削除' },

  // ── Alarm list ──────────────────────────────────────────
  'alarm.title': { en: 'Alarm', ja: 'アラーム' },
  'alarm.repeatOnce': { en: 'Once', ja: '単発' },
  'alarm.repeatDaily': { en: 'Every day', ja: '毎日' },
  'alarm.recoveryEarly': { en: 'Earlier, to recover', ja: '回復のため早め' },
  'alarm.fromTarget': { en: 'From your goal', ja: '目標から逆算' },
  'alarm.empty': { en: 'No alarms yet', ja: 'アラームはまだありません' },
  'alarm.snoozeMeta': { en: (p) => ` · Snooze ${p.min} min`, ja: (p) => ` ・ スヌーズ${p.min}分` },
  'alarm.add': { en: '+ Add alarm', ja: '＋ アラームを追加' },
  'alarm.enableAria': { en: (p) => `Enable ${p.time}`, ja: (p) => `${p.time} を有効化` },

  // ── Alarm editor ────────────────────────────────────────
  'editor.repeat': { en: 'Repeat', ja: '繰り返し' },
  'editor.repeatHint': { en: 'None selected = next time only (one-shot)', ja: '未選択なら次回のみ（単発）' },
  'editor.sound': { en: 'Sound', ja: 'サウンド' },
  'editor.preview': { en: 'Preview', ja: '試聴' },
  'editor.snooze': { en: 'Snooze', ja: 'スヌーズ' },
  'editor.snoozeInterval': { en: 'Snooze interval', ja: 'スヌーズ間隔' },
  'editor.delete': { en: 'Delete this alarm', ja: 'このアラームを削除' },

  // ── Settings ────────────────────────────────────────────
  'settings.theme': { en: 'Theme', ja: 'テーマ' },
  'settings.targetDuration': { en: 'Sleep goal', ja: '目標睡眠時間' },
  'settings.defaultWake': { en: 'Default wake time', ja: '既定の起床時刻' },
  'settings.bedtimeReminder': { en: 'Bedtime reminder', ja: '就寝リマインダー' },
  'settings.smartAlarm': { en: 'Smart wake', ja: 'スマート起床' },
  'settings.smartAlarmHint': {
    en: (p) =>
      `Within ${p.min} min before the alarm, if movement suggests light sleep, it wakes you a little early. Works only during a foregrounded, screen-on session.`,
    ja: (p) =>
      `アラーム前${p.min}分以内に体動から浅い眠りを検知すると、少し早めに起こします。画面を点けたままのセッション中のみ動作します。`,
  },
  'settings.smartWindow': { en: 'Smart-wake window', ja: 'スマート起床の検知時間' },
  'settings.healthSync': { en: 'Apple Health', ja: 'ヘルスケア連携' },
  'settings.healthSyncHint': {
    en: 'Mirror confirmed nights to the Health app as in-bed sleep. One-way; Madoromi never reads your Health data.',
    ja: '記録した睡眠をヘルスケアアプリに「ベッドにいる時間」として書き出します。書き込みのみで、ヘルスケアのデータを読み取ることはありません。',
  },
  'settings.widget': { en: 'Home Screen widget', ja: 'ホーム画面ウィジェット' },
  'settings.widgetHint': {
    en: 'Add the Madoromi widget from your Home Screen to see today’s thinking condition and sleep debt at a glance. It refreshes after each morning check.',
    ja: 'ホーム画面にMadoromiのウィジェットを追加すると、今日の思考コンディションと睡眠負債をひと目で確認できます。朝のチェックのたびに自動で更新されます。',
  },
  // ── spoken shapes (text alternatives for the visual encodings) ──
  'alarm.planAria': {
    en: (p) => `You plan to sleep from ${p.bed} to ${p.wake} — ${p.dur}.`,
    ja: (p) => `${p.bed}から${p.wake}まで、${p.dur}の睡眠予定です。`,
  },
  'repeat.once': { en: 'Once', ja: '次回のみ' },
  'repeat.daily': { en: 'Every day', ja: '毎日' },
  'repeat.weekdays': { en: 'Weekdays', ja: '平日' },
  'repeat.weekends': { en: 'Weekends', ja: '土日' },
  'repeat.off': { en: 'Off', ja: 'オフ' },
  'history.nightsAria': {
    en: 'Each night at its clock time',
    ja: '各夜の就寝から起床までの時間帯',
  },
  'history.rangeAria': { en: 'Time range', ja: '表示期間' },
  'history.nightAria': {
    en: (p) => `${p.day} — slept ${p.start} to ${p.end}, ${p.dur}, quality ${p.q}.`,
    ja: (p) => `${p.day}曜 — ${p.start}から${p.end}、${p.dur}、質スコア${p.q}。`,
  },
  'history.nightAriaNoScore': {
    en: (p) => `${p.day} — slept ${p.start} to ${p.end}, ${p.dur}.`,
    ja: (p) => `${p.day}曜 — ${p.start}から${p.end}、${p.dur}。`,
  },
  'chart.qualityRangeAria': {
    en: (p) =>
      `Quality across ${p.n} ${plural(p.n, 'night', 'nights')} ranged from ${p.min} to ${p.max}.`,
    ja: (p) => `${p.n}日間の質スコアは${p.min}〜${p.max}でした。`,
  },
  'home.skylineAria': {
    en: (p) =>
      `${p.met} of the last ${p.n} ${plural(p.n, 'night', 'nights')} met your goal.`,
    ja: (p) => `直近${p.n}日のうち${p.met}日は目標にとどきました。`,
  },

  // ── share card ──────────────────────────────────────────
  'share.action': { en: 'Share as a card', ja: 'カードにして共有' },
  'share.title': { en: 'Share card', ja: '共有カード' },
  'share.preparing': { en: 'Preparing the card…', ja: 'カードを作成中…' },
  'share.failed': {
    en: 'Couldn’t make an image on this device.',
    ja: 'この端末では画像を作れませんでした。',
  },
  'share.retry': { en: 'Try again', ja: 'もう一度' },
  'share.showTimes': { en: 'Include bed & wake times', ja: '就寝・起床の時刻を入れる' },
  'share.showTheme': { en: 'Include the night’s theme', ja: 'その夜のテーマを入れる' },
  'share.privacyNote': {
    en: 'A shared image stays on the other person’s device. Your notes are never included.',
    ja: '共有した画像は相手の端末に残ります。メモが入ることはありません。',
  },
  'share.saved': { en: 'Saved to your downloads.', ja: 'ダウンロードに保存しました。' },
  'share.longPress': {
    en: 'Press and hold the card above to save it. A screenshot works too.',
    ja: '上のカードを長押しすると保存できます。スクリーンショットでも大丈夫です。',
  },
  'share.card.kicker': { en: 'SLEEP', ja: '睡眠時間' },
  'share.card.tagline': { en: 'Sleep for thinking', ja: '思考のための睡眠' },
  'share.aria': {
    en: (p) => `Share card: ${p.date}, slept ${p.dur}.`,
    ja: (p) => `共有カード：${p.date}、睡眠 ${p.dur}。`,
  },
  'share.caption': {
    en: (p) => `${p.date} · slept ${p.dur} — Madoromi`,
    ja: (p) => `${p.date}・睡眠 ${p.dur} — Madoromi`,
  },

  // ── clock ───────────────────────────────────────────────
  'clock.am': { en: 'AM', ja: '午前' },
  'clock.pm': { en: 'PM', ja: '午後' },
  'clock.title': { en: 'Clock', ja: '時刻表示' },
  'clock.auto': { en: 'Auto', ja: '自動' },
  'clock.12': { en: '12h', ja: '12時間' },
  'clock.24': { en: '24h', ja: '24時間' },
  'dial.period': { en: 'AM or PM', ja: '午前・午後' },

  // ── data faults (a read that could not be trusted) ──────
  'data.faultTitle': {
    en: 'Some stored data could not be read',
    ja: '読み取れなかったデータがあります',
  },
  'data.faultSessions': {
    en: 'Your sleep log could not be read, so the app is starting a fresh one.',
    ja: '睡眠の記録を読み取れなかったため、新しい記録を開始しています。',
  },
  'data.faultAlarms': {
    en: 'Your alarms could not be read, so the list is starting empty.',
    ja: 'アラームを読み取れなかったため、一覧は空から始まっています。',
  },
  'data.faultPartial': {
    en: (p) => `${p.count} ${plural(p.count, 'entry was', 'entries were')} unreadable and left out.`,
    ja: (p) => `${p.count}件が読み取れず、除外されています。`,
  },
  'data.faultKept': {
    en: 'The original file has been set aside, not deleted — restoring a backup replaces it.',
    ja: '元のファイルは削除せず退避してあります。バックアップを読み込むと置き換わります。',
  },
  'settings.exportData': { en: 'Export data (JSON)', ja: 'データをエクスポート（JSON）' },
  'settings.export': { en: 'Export', ja: '書き出す' },
  'settings.exportCsvData': { en: 'Export sleep log (CSV)', ja: '睡眠ログを書き出す（CSV）' },
  'settings.exportCsv': { en: 'Export CSV', ja: 'CSVで書き出す' },
  'settings.importData': { en: 'Restore from backup', ja: 'バックアップから読み込み' },
  'settings.import': { en: 'Restore', ja: '読み込む' },
  'settings.wipeData': { en: 'Delete all data', ja: 'すべてのデータを削除' },
  'settings.disclaimer': {
    en: 'Sleep debt and scores are a gentle guide, not health or medical advice.',
    ja: '睡眠負債やスコアは健康・医療上の助言ではなく、あくまで目安です。',
  },
  'settings.exportTitle': { en: 'Export', ja: 'エクスポート' },
  'settings.importTitle': { en: 'Restore from backup', ja: 'バックアップから読み込み' },
  'settings.importHint': {
    en: 'Paste the JSON you exported. Your current records and alarms will be overwritten.',
    ja: '書き出したJSONを貼り付けてください。現在の記録・アラームは上書きされます。',
  },
  'settings.importConfirm': { en: 'Overwrite & restore', ja: '上書きして読み込む' },
  'settings.wipeTitle': { en: 'Delete everything?', ja: 'すべて削除しますか？' },
  'settings.wipeHint': {
    en: 'All history, alarms, and settings will be erased. This cannot be undone.',
    ja: '履歴・アラーム・設定がすべて消えます。この操作は取り消せません。',
  },
  'settings.wipeConfirm': { en: 'Delete everything', ja: 'すべて削除する' },

  // ── Onboarding ──────────────────────────────────────────
  'alarm.bed': { en: 'Bed', ja: '就寝' },
  'alarm.wake': { en: 'Wake', ja: '起床' },

  'onb.tagline': { en: 'Design sleep for thinking', ja: '思考のための睡眠を設計する' },
  'onb.intro': {
    en: 'Tonight’s sleep becomes tomorrow’s thinking.',
    ja: '今夜の眠りが、明日の思考になる。',
  },
  'onb.goalTitle': { en: 'Set your goal', ja: '目標を決めましょう' },
  'onb.targetLabel': { en: 'Sleep goal', ja: '目標睡眠時間' },
  'onb.wakeLabel': { en: 'Wake time', ja: '起床時刻' },
  'onb.bedtimeHint': {
    en: (p) => `That puts your bedtime around ${p.time}.`,
    ja: (p) => `逆算した就寝の目安は ${p.time} 頃です。`,
  },
  'onb.permTitle': { en: 'Notifications', ja: '通知の許可' },
  'onb.permBody': {
    en: 'We use notifications to deliver your wake alarm and bedtime reminder.',
    ja: '起床アラームと就寝リマインダーをお届けするために通知を使います。',
  },
  'onb.permWeb': {
    en: ' (Notifications don’t fire in the browser — please check on a device.)',
    ja: '（ブラウザでは通知は発火しません。実機でご確認ください）',
  },
  'onb.permDisclaimer': {
    en: 'Note: on iOS, lock screen, silent mode, and Focus can affect delivery, so a guaranteed loud alarm isn’t promised — it’s a notification-based guide.',
    ja: '※ iOS ではロック中・サイレント・集中モードの影響を受けるため、確実に大音量で鳴る目覚ましは保証されません。あくまで通知ベースの目安です。',
  },
  'onb.permGranted': { en: 'Notifications enabled', ja: '通知を許可しました' },
  'onb.permDenied': { en: 'You can change this later in Settings', ja: 'あとで設定から変更できます' },
  'onb.allowNotif': { en: 'Allow notifications', ja: '通知を許可' },
  'onb.finishWithReminder': {
    en: 'Turn on bedtime reminder & start',
    ja: '就寝リマインダーをオンにして始める',
  },
  'onb.skipNotif': { en: 'Skip — start without notifications', ja: 'あとで・通知なしで始める' },
};

/** Resolve a key for a language, interpolating params when needed. */
export function translate(lang: Lang, key: string, params?: Params): string {
  const m = messages[key];
  if (!m) return key;
  const v = m[lang] ?? m.en;
  return typeof v === 'function' ? v(params ?? {}) : v;
}

// ── locale-aware formatting helpers (pure) ────────────────

/** Localized weekday short name for 0=Sun..6=Sat. */
export function weekdayName(i: number, lang: Lang): string {
  const arr = lang === 'ja' ? JA_WEEKDAYS : EN_WEEKDAYS;
  return arr[i] ?? '';
}

/** Format a minute count: "7h 30m" (en) / "7時間30分" (ja). */
export function formatDuration(min: number, lang: Lang): string {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (lang === 'ja') {
    if (h === 0) return `${sign}${m}分`;
    if (m === 0) return `${sign}${h}時間`;
    return `${sign}${h}時間${m}分`;
  }
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/** Date label: "Jun 20 (Fri)" (en) / "6月20日(金)" (ja). */
export function formatDate(d: Date, lang: Lang): string {
  const wd = weekdayName(d.getDay(), lang);
  if (lang === 'ja') {
    return `${d.getMonth() + 1}月${d.getDate()}日(${wd})`;
  }
  return `${EN_MONTHS[d.getMonth()]} ${d.getDate()} (${wd})`;
}
