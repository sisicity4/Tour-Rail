# デプロイ

## Render Blueprint

設定の基準は [render.yaml](../render.yaml) です。

作成されるサービス:

- `tour-rail-api`: Python Web Service
- `tour-rail-web`: Static Site

## 重要設定

### バックエンド

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

### フロントエンド

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite rule: すべてのパスを `/index.html` に向ける

## CORS

バックエンドは次のオリジンを許可します。

- localhost 系の開発URL
- `*.onrender.com` の Render 本番URL
- `*.vercel.app` の Vercel 公開URL（常時稼働デモ用）

本番環境でフロントエンドから API に接続できない場合は、次を確認します。

1. `ALLOWED_ORIGINS`
2. `ALLOWED_ORIGIN_REGEX`
3. `VITE_API_BASE_URL`

## デプロイ後の確認

1. バックエンドの `/health` を開く
2. フロントエンドを開く
3. `/config` が成功することを確認する
4. 地図上に 2 点以上のスポットを追加する
5. `/route` が成功することを確認する
6. 移動アニメーションが開始できることを確認する
