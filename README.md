# CLASSROOM DRAW

授業中の出席番号抽選を、見やすく・盛り上がる演出で行う静的Webアプリです。

## 主な機能
- 通常抽選
- サバイバル抽選
- MISSION抽選
- 欠席番号除外
- 指名済み優先制御
- 指名履歴
- 1回戻す / 当日履歴リセット
- ブラウザ内保存
- 効果音
- LUCKY SAFE
- manual.html

## 構成
- index.html
- style.css
- app.js
- manual.html
- my-hub.json

## 公開
公開時はCloudflare側で実効的なアクセス制限を設定してください。ソース内にパスワードや秘密情報を入れないでください。


## Limited公開（標準）
Cloudflare Worker側で4桁パスワード認証を行います。

必要なCloudflare Secrets:
- `APP_PASSWORD`: ユーザーが決める4桁数字
- `SESSION_SECRET`: 十分に長いランダム文字列

これらの値はGitHubへ保存しません。未設定の場合はアプリ本体を配信せず503を返します。
ログアウトURL: `/__auth/logout`
