# App Store Connect Submission Metadata — Madoromi

このファイルは App Store Connect に入力する情報の下書き。実機ビルドのアップロード後、
そのまま転記できるようにまとめている。**プライマリ言語は英語（English U.S.）**で申請し、
日本語はローカリゼーションとして追加する。

---

## 基本情報 / Basics

| 項目 | 値 |
| --- | --- |
| App 名（英語/プライマリ） | Madoromi |
| App 名（日本語ローカリゼーション） | Madoromi（まどろみ） |
| Bundle ID | app.madoromi |
| SKU | madoromi-ios-001 |
| プライマリ言語 / Primary Language | **English (U.S.)** |
| 対応言語 / Localizations | English (U.S.), Japanese |
| バージョン | 1.0（ビルド 1） |
| プライマリカテゴリ | ヘルスケア/フィットネス（Health & Fitness） |
| セカンダリカテゴリ | ライフスタイル（Lifestyle） |
| 価格 | 無料 / Free |
| App 内課金 | なし / None |

> アプリの UI 既定言語は英語。初回起動（オンボーディング）と設定画面の両方から
> 日本語へ切り替え可能。App Store の表示も英語を既定とし、日本語環境では下記の
> 日本語ローカリゼーションが表示される。

---

## English (Primary) listing

### Subtitle (≤30 chars)

> Design sleep for thinking

### Promotional Text (≤170 chars)

> See your sleep as tomorrow’s thinking condition. Quietly track bedtime, wake
> time and rest quality, then get a gentle, debt-aware bedtime guide — never a verdict.

### Description

> Madoromi is a quiet sleep app for people who think for a living. Instead of
> nagging you with health metrics, it reflects your sleep back as a calm read on
> how clearly you’ll think tomorrow.
>
> What it does
> • Log bedtime and wake time, with a quick subjective rating of how you slept
> • A sleep score (a guide, not a verdict) from duration and your own rating
> • Sleep debt: how far you are from your target sleep
> • A recovery-aware bedtime reminder, worked back from your goal and debt
> • Daily, weekly and monthly trends for duration and quality
> • Three themes that follow your device’s dark setting and the time of day
>   (day / night / a no-glow mode while you sleep)
>
> The thinking behind it
> • Numbers are a guide (目安), never a verdict. A calm UI that never rushes you.
> • All data stays on your device. No account, no sign-in, no tracking.
>
> About notifications (honestly)
> Because of how iOS works, a notification alone cannot guarantee a loud alarm
> that breaks through the silent switch or Focus modes. Madoromi gently signals
> bedtime and wake time on a best-effort, notification-based basis.

### Keywords (≤100 chars, comma-separated)

> sleep,sleep tracker,sleep debt,alarm,bedtime,wake up,sleep score,routine,rest,focus,condition,health

---

## 日本語（ローカリゼーション）/ Japanese localization

### サブタイトル（30字以内）

> 思考のための睡眠を設計する

### プロモーションテキスト（170字以内）

> 眠りを「翌日の思考コンディション」として静かに可視化。就寝・起床・主観の質を記録し、
> 目標とのズレ（睡眠負債）と、回復のための就寝時刻の目安を、そっと差し出します。

### 説明（Description）

> まどろみは、「思考のための睡眠を設計する」ための、静かな睡眠アプリです。
>
> 健康指標を煽るのではなく、眠りを翌日の思考のキレを保つコンディションとして、
> 落ち着いたトーンで可視化します。
>
> ■ できること
> ・就寝/起床の記録と、眠りの「質」の主観入力
> ・時間スコアと主観スコアから算出する睡眠スコア（目安）
> ・目標睡眠時間とのズレ＝睡眠負債の可視化
> ・負債を踏まえた「回復のための就寝リマインダー」の逆算
> ・日別/週別/月別の睡眠時間と質スコアの推移
> ・端末のダーク設定と時間帯に追従する3つのテーマ（昼/夜/睡眠中の無発光）
>
> ■ 設計の思想
> ・数値は断定ではなく「目安」。生活を急かさない静かなUI。
> ・データはすべて端末内に保存。アカウント登録は不要、ログインもありません。
>
> ■ 通知について（正直に）
> iOSの仕様上、サイレントスイッチや集中モードを越えて確実に大音量で鳴る目覚ましは、
> 通知だけでは実現できません。まどろみは通知ベースのベストエフォートで就寝・起床を
> そっと知らせます。

### キーワード（100字以内・カンマ区切り）

> 睡眠,睡眠記録,睡眠負債,目覚まし,アラーム,就寝,起床,生活リズム,睡眠スコア,コンディション,習慣,ヘルスケア

---

## URL

| 項目 | 値（要確定） |
| --- | --- |
| サポートURL / Support URL | https://madoromi.app/support |
| マーケティングURL / Marketing URL | https://madoromi.app |
| プライバシーポリシーURL / Privacy Policy URL | https://madoromi.app/privacy （本リポジトリ ios/AppStore/privacy-policy.md の内容を掲載） |

> 注: ドメイン madoromi.app は未取得なら取得が必要。サポート/プライバシーの2URLは申請に必須。

## 年齢制限（Age Rating）

> 想定: 4+（暴力・露骨表現・ギャンブル等すべて「なし」）

---

## App プライバシー（Nutrition Label）

申請時の質問への回答:

- **データを収集していますか?** → **いいえ（No, we do not collect data from this app）**
  - 睡眠記録・設定・アラームはすべて端末内（UserDefaults 経由のローカル保存）に留まり、
    開発者や第三者に送信されない。
  - 解析SDK・広告SDK・トラッキングなし。
- **トラッキング** → なし（NSPrivacyTracking=false、PrivacyInfo.xcprivacy と一致）。

> PrivacyInfo.xcprivacy は UserDefaults（required reason: CA92.1 = 自App専用データの読み書き）
> のみを宣言。これと App プライバシー回答（データ収集なし）は整合している。

---

## App Review に伝える情報（Review Notes）

> ・ログイン不要。アカウント/デモ資格情報は不要です。
> ・UI の既定言語は英語。初回起動画面と設定画面の両方から日本語に切り替え可能です。
> ・通知（LocalNotifications）の権限: 就寝/起床リマインダーと目覚ましのために使用します。
>   許可しなくてもアプリの記録機能は利用できます。
> ・モーション（NSMotionUsageDescription）: 将来の体動スコア向けの計測に使用します。
>   許可は任意で、拒否しても主要機能は動作します。
> ・暗号化: 独自/非標準の暗号化は使用していません（ITSAppUsesNonExemptEncryption=false）。
> ・すべてのデータは端末内に保存され、サーバ送信はありません。

## 輸出コンプライアンス

> ITSAppUsesNonExemptEncryption = false を Info.plist に設定済みのため、
> App Store Connect 上での追加申告は不要（自動でクリア）。
