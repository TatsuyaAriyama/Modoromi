# Madoromi（まどろみ）

> 思考のための睡眠を設計する — 良い睡眠を整えることで翌日の思考のキレを最大化する、静かな睡眠アプリ。

React 18/19 + TypeScript + Vite + Capacitor で作る iOS / Android 向け睡眠アプリ。就寝・起床・質を可視化し、目標睡眠時間とのズレ（睡眠負債）を翌日の思考コンディションとして見せます。

## スクリプト

```bash
npm run dev        # Vite 開発サーバ
npm run build      # 型チェック + 本番ビルド (dist/)
npm run test       # domain ロジックの単体テスト (Vitest)
npm run test:watch # テストの watch モード
npm run lint       # ESLint
```

## アーキテクチャ

```
src/
  app/        ルーティング(App)・Zustand ストア・テーマ解決
  theme/      CSS 変数トークン（day / night / sleep の3モード）
  features/   home / session / morning / alarm / history / settings
  components/ Card, TimeDial, MoodPicker, BarChart, LineChart, Button など
  domain/     型・スコア算出・睡眠負債・履歴集計（純粋関数 = テスト対象）
  data/       Repository 実装（@capacitor/preferences 越しのローカル JSON 永続化）
  lib/        notifications / haptics / keepAwake / platform ラッパ
```

- **永続化**は `SleepRepository` / `AlarmRepository` / `SettingsRepository` インターフェース越し。
  実装は `@capacitor/preferences`（Web では同プラグインのフォールバック）。`localStorage` /
  `sessionStorage` をアプリコードから直接触らない設計。将来 SQLite に差し替え可能。
- **テーマ**は `data-theme` 属性で `day` / `night` / `sleep` を切替。起動時は端末ダーク設定に従い、
  夜間（22時〜6時）は night を優先。睡眠セッション中は sleep（無発光）。

## 睡眠スコア（MVP）

時間スコア60% + 主観スコア40%。重みは `domain/score.ts` の `SCORE_WEIGHTS` で定数化し、
Phase 2 の体動スコアを第3項として足せる形にしています。

## アラーム / 通知の制約（正直に）

iOS では LocalNotifications **だけ**で「ロック中・サイレント・集中モードでも確実に大音量で鳴る
目覚まし」を実現できません（critical alert は特別な entitlement が必要）。MVP は通知ベースの
ベストエフォートで、UI でもその旨を一言断っています。本格的な目覚まし挙動は Phase 2。

## ネイティブ化（Capacitor）

Web ビルドはそのまま動きます。iOS / Android プロジェクトの生成はローカル環境（Xcode /
Android Studio）で以下を実行してください。

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

### アプリアイコン

`public/favicon.svg` にブランド配色（トワイライト＋閉じた目）のソースを置いています。
1024px の `madoromi-classic-ios-1024.png` を用意し、`@capacitor/assets` で各サイズを生成できます。

```bash
npm i -D @capacitor/assets
# resources/icon.png (1024x1024) を置いてから
npx @capacitor/assets generate --iconBackgroundColor '#6A56A8' --iconBackgroundColorDark '#1A1430'
```

表示名は `Madoromi`（`capacitor.config.ts` の `appName`）。
