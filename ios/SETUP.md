# iOS セットアップ（提出前の手順）

`npx cap add ios` 済み。ビルド/UI が固まったら、Xcode が入った Mac で以下を実施します。

## 1. 最新の web をネイティブへ反映

```bash
npm run build && npx cap sync ios
npx cap open ios   # Xcode で App.xcworkspace を開く
```

## 2. 署名（Signing & Capabilities）

- ターゲット **App** → *Signing & Capabilities*
- **Team** を自分の Apple Developer アカウントに設定（Automatically manage signing）
- Bundle Identifier は `app.madoromi`（必要なら自分のものに変更）

## 3. Time-Sensitive 通知を有効化

- *Signing & Capabilities* → **+ Capability** → **Time Sensitive Notifications** を追加
- これで `App.entitlements` の `com.apple.developer.usernotifications.time-sensitive`
  がプロビジョニングプロファイルと一致します
- 朝アラームの通知は集中モード（Focus）を貫通します
- ⚠️ ハードウェアのサイレントスイッチを無視するには **Critical Alerts**
  エンタイトルメントが別途必要で、Apple への個別申請が要ります（消費者向け
  アラームアプリにはほぼ許可されません）

## 4. アラーム音（同梱済み）

- `ios/App/App/madoromi_alarm.caf`（12秒・44.1kHz・mono・16bit）を
  バンドルリソースに登録済み。通知の `sound: 'madoromi_alarm.caf'` と一致
- 音を作り直す場合:
  ```bash
  cd resources/audio
  python3 make_alarm.py
  afconvert -f caff -d LEI16@44100 -c 1 madoromi_alarm.wav \
      ../../ios/App/App/madoromi_alarm.caf
  rm madoromi_alarm.wav
  ```

## 5. 実機テスト

- 実機を接続して Run。`NSMotionUsageDescription`（体動記録）の許可ダイアログ、
  通知許可、設定時刻のアラーム発火（画面オフ・アプリ終了状態）を確認

## 6. App Store Connect へ提出

- *Product → Archive* → Distribute App
- App Store Connect でアプリ作成（名称・説明・スクショ・プライバシー）
- レビュー提出
