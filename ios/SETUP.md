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

## 6. アイコン / スプラッシュ / プライバシー（同梱済み）

- **App アイコン**: `Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  をブランド版（トワイライト＋閉じた目、1024×1024・アルファなし）へ差し替え済み。
- **スプラッシュ**: `Assets.xcassets/Splash.imageset/` の3枚を、深いトワイライト背景に
  eyemark を中央配置した静かなデザインへ差し替え済み（`scaleAspectFill`）。
- **プライバシーマニフェスト**: `App/PrivacyInfo.xcprivacy` を作成し Xcode のリソースに
  登録済み。UserDefaults（理由コード CA92.1）のみ宣言、トラッキング/データ収集なし。
- アイコン/スプラッシュを作り直す場合:
  ```bash
  qlmanage -t -s 1024 -o /tmp resources/icon.svg        # SVG→PNG
  python3 -c "from PIL import Image; im=Image.open('/tmp/icon.svg.png').convert('RGBA'); \
    bg=Image.new('RGB',im.size,(106,86,168)); bg.paste(im,mask=im.split()[3]); \
    bg.save('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')"
  python3 resources/make_splash.py   # （/tmp/make_splash.py を resources/ に保存した場合）
  ```

## 7. 書き出しコンプライアンス / バージョン（設定済み）

- `Info.plist` に `ITSAppUsesNonExemptEncryption=false` を設定済み（追加申告不要）。
- `MARKETING_VERSION=1.0` / `CURRENT_PROJECT_VERSION=1`。向きは iPhone/iPad とも縦固定。

## 8. App Store Connect へ提出

- *Product → Archive* → Distribute App
- App Store Connect でアプリ作成（名称・説明・スクショ・プライバシー）
  - メタデータは `ios/AppStore/metadata.md`、プライバシーポリシーは
    `ios/AppStore/privacy-policy.md` の内容をそのまま使用
  - App プライバシーは「データを収集していません」を選択（マニフェストと整合）
- レビュー提出
