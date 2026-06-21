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
  'tab.home': { en: 'Today', ja: '今日' },
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
  'breath.pace.box': { en: 'Box 4-4-4-4', ja: '箱呼吸 4-4-4-4' },
  'breath.pace.fourSevenEight': { en: '4-7-8', ja: '4-7-8' },

  // ── alarm sounds ────────────────────────────────────────
  'sound.chime': { en: 'Chime', ja: 'チャイム' },
  'sound.bell': { en: 'Bell', ja: 'ベル' },
  'sound.marimba': { en: 'Marimba', ja: 'マリンバ' },
  'sound.dawn': { en: 'Dawn', ja: '夜明け' },

  // ── wind-down soundscapes ───────────────────────────────
  'sound.off': { en: 'Silent', ja: '無音' },
  'sound.rain': { en: 'Rain', ja: '雨' },
  'sound.waves': { en: 'Waves', ja: '波' },
  'sound.hush': { en: 'Hush', ja: 'しずか' },

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
    en: (p) => `${p.count} movements`,
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
  'insight.theme-quality': {
    en: (p) => `Mornings you set a thinking theme tend to score higher (avg +${p.diff})`,
    ja: (p) => `思考テーマを決めた朝は、質スコアが高めです（平均 +${p.diff}）`,
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
  'cond.sharpCopy': { en: 'Your thinking should flow well today', ja: '思考がよく回りそうな一日です' },
  'cond.steadyCopy': { en: 'A steady, settled condition today', ja: '安定したコンディションです' },
  'cond.foggyCopy': { en: 'Ease in — start with lighter focus', ja: '無理せず、軽めの集中から始めましょう' },
  'cond.depletedCopy': { en: 'Prioritize recovery; an early night tonight', ja: '回復を優先して。今夜は早めの就寝を' },

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
    en: (p) => `${p.count} movements`,
    ja: (p) => `寝返り ${p.count} 回`,
  },
  'morning.condition': { en: 'This morning’s condition', ja: '今朝のコンディション' },
  'morning.subjective': { en: 'How rested do you feel? (1–5)', ja: '主観的な眠りの質（1〜5）' },
  'morning.theme': { en: 'Something to think about today (optional)', ja: '今日、考えたいこと（任意）' },
  'morning.themePlaceholder': { en: 'e.g. outline the project brief', ja: '例：企画の骨子をまとめる' },
  'morning.note': { en: 'A quick note (optional)', ja: 'ひとことメモ（任意）' },
  'morning.notePlaceholder': { en: 'had a dream / woke in the night, etc.', ja: '夢を見た / 途中で目が覚めた など' },
  'morning.save': { en: 'Save', ja: '保存する' },
  'morning.later': { en: 'Later (log the time only)', ja: 'あとで（時間だけ記録）' },

  // ── Wind-down ───────────────────────────────────────────
  'wind.title': { en: 'Breathe, and let the day go', ja: '深呼吸して、頭をほどく' },
  'wind.ready': { en: 'You’re ready. Good night', ja: '準備ができました。おやすみなさい' },
  'wind.guide': { en: 'Breathe slowly, in time with the circle', ja: '円に合わせて、ゆっくり呼吸しましょう' },
  'wind.start': { en: 'Drift off to sleep', ja: '眠りにつく' },
  'wind.pace': { en: 'Breathing pace', ja: '呼吸のペース' },
  'wind.sound': { en: 'Ambient sound', ja: '環境音' },

  // ── Nap ─────────────────────────────────────────────────
  'nap.title': { en: 'Nap', ja: '仮眠' },
  'nap.doneTitle': { en: 'Good morning', ja: 'おはよう' },
  'nap.doneNote': { en: 'Feeling a little clearer?', ja: '少し頭が軽くなりましたか' },
  'nap.wake': { en: 'Wake up', ja: '起きる' },

  // ── Session (asleep) ────────────────────────────────────
  'session.alarm': { en: (p) => `Alarm ${p.time}`, ja: (p) => `アラーム ${p.time}` },
  'session.smartWake': { en: 'Smart wake', ja: 'スマート起床' },
  'session.recording': { en: 'Recording movement', ja: '体動を記録中' },
  'session.keepAwake': { en: 'Keep the screen on', ja: '画面を点けたままにする' },
  'session.holdToWake': { en: 'Press and hold — “I’m up”', ja: '長押しで「起きた」' },
  'session.wakeTime': { en: 'Time to wake up', ja: '起きる時間です' },
  'session.dismiss': { en: 'Stop & get up', ja: '止めて起きる' },
  'session.snooze': { en: (p) => `Snooze ${p.min} min`, ja: (p) => `スヌーズ ${p.min}分` },

  // ── History ─────────────────────────────────────────────
  'history.week': { en: 'Week', ja: '週' },
  'history.month': { en: 'Month', ja: '月' },
  'history.weeklyReview': { en: 'This week', ja: '今週の振り返り' },
  'history.logged': { en: (p) => `${p.nights} nights logged`, ja: (p) => `記録 ${p.nights}日` },
  'history.vsPrev': { en: (p) => ` · ${p.delta} vs last week`, ja: (p) => ` ・ 先週比 ${p.delta}` },
  'history.insights': { en: 'Noticing', ja: '気づき' },
  'history.avgDuration': { en: 'Avg. sleep', ja: '平均睡眠時間' },
  'history.avgQuality': { en: 'Avg. quality', ja: '平均質スコア' },
  'chart.durationTarget': { en: 'Sleep duration (dotted = goal)', ja: '睡眠時間（点線 = 目標）' },
  'chart.qualityTrend': { en: 'Quality-score trend', ja: '質スコアの推移' },
  'chart.conditionTrend': { en: 'Thinking-condition trend', ja: '思考コンディションの推移' },
  'chart.condition': { en: 'Thinking-condition trend over time', ja: '思考コンディションの推移' },
  'history.sessions': { en: 'Sessions', ja: 'セッション' },
  'history.empty': { en: 'No records yet', ja: 'まだ記録がありません' },
  'history.themes': { en: 'Thinking themes', ja: '思考テーマのふり返り' },

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
    ja: 'ホーム画面にまどろみのウィジェットを追加すると、今日の思考コンディションと睡眠負債をひと目で確認できます。朝のチェックのたびに自動で更新されます。',
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
  'onb.tagline': { en: 'Design sleep for thinking', ja: '思考のための睡眠を設計する' },
  'onb.intro': {
    en: 'More than tracking — designing sleep. It surfaces your bedtime, wake time, and quality, and quietly reflects any gap from your goal as tomorrow’s thinking condition.',
    ja: '睡眠を記録するだけでなく、設計する。就寝・起床・質を可視化し、目標とのズレを翌日の思考コンディションとして静かに見せます。',
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
  'onb.finishWithReminder': { en: 'Turn on bedtime reminder & start', ja: '就寝リマインダーをON にして始める' },
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
