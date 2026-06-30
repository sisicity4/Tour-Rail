# HANDOFF — 手動で行う仕上げ作業

このリポジトリのコード/ドキュメント側の改善は完了済みです。
ここには **あなたのアカウント操作が必要なため自動化できない作業** をまとめています。上から順に進めれば、採用担当に見せる状態が完成します。

---

## 1. フロントエンドを Vercel に常時公開（最優先）

Render 無料枠はスリープするため、初回アクセスが「重い/動かない」第一印象になりがちです。静的フロントだけでも Vercel に常時公開すると、地図 UI が即座に表示され完成度が伝わります。

```bash
npm i -g vercel          # 未インストールの場合
cd frontend
vercel login             # ブラウザでログイン
vercel --prod            # 初回はプロジェクト作成のウィザードに従う
```

- `frontend/vercel.json` は用意済み（Vite ビルド + SPA rewrite）。
- デプロイ時に環境変数を設定する:
  - `VITE_API_BASE_URL` = Render にデプロイ済みバックエンドの URL（例 `https://tour-rail-api.onrender.com`）
  - Vercel ダッシュボード → Project → Settings → Environment Variables から追加し、再デプロイ。
- CORS は対応済み（バックエンドが `*.vercel.app` を許可するよう `render.yaml` / `backend/main.py` を更新済み）。
  **既にデプロイ済みの Render バックエンドがある場合**は、環境変数 `ALLOWED_ORIGIN_REGEX` を
  `^https://.*\.(onrender\.com|vercel\.app)$`
  に更新して再デプロイ（または Blueprint を Sync）してください。これをしないと Vercel から `/route` が CORS で弾かれます。

### デプロイ後
1. 公開された Vercel URL を控える（例 `https://tour-rail.vercel.app`）。
2. `README.md` 冒頭のリンク行を差し替える:
   - 変更前: `ライブデモ（公開準備中 — 手順は [HANDOFF.md](HANDOFF.md)）`
   - 変更後: `[ライブデモ](https://<あなたのVercel URL>)`

---

## 2. GitHub プロフィールで Tour-Rail をピン留め

「フロント＋バック＋外部API＋分離デプロイ」を 1 つで示せる Tour-Rail を Pinned 先頭にします（公開 API では安定設定できないため UI 操作）。

1. GitHub プロフィール（`https://github.com/sisicity4`）を開く。
2. Pinned 欄の **「Customize your pins」** をクリック。
3. **Tour-Rail にチェック**を入れ、`any-face-dice` のチェックを外す（6 枠を超える場合）。
4. 保存後、Pinned のドラッグ並べ替えで **Tour-Rail を先頭** に移動。

---

## 3. プロフィール README にデモ URL を追加（任意・おすすめ）

`sisicity4/sisicity4` リポジトリ（プロフィール README）に、Tour-Rail のライブデモ URL を 1 行追加すると完成度が伝わります。

例:
```markdown
- 🚆 **Tour-Rail** — 旅行ルート可視化アプリ（React + FastAPI + OSRM） … [ライブデモ](https://<あなたのVercel URL>) / [リポジトリ](https://github.com/sisicity4/Tour-Rail)
```

---

## 付録: スクリーンショット / GIF の再生成方法

`docs/assets/tour-rail-demo.gif` と `docs/assets/tour-rail-screenshot.jpg` は、ローカルでアプリを起動して撮影したものです。UI を変えて撮り直す場合:

1. バックエンド: `cd backend && source .venv/bin/activate && uvicorn main:app --port 8000`
2. フロント: `cd frontend && npm run dev`
3. ブラウザ（`http://localhost:5173`）で地図にスポットを 2〜3 点置き、ルート/移動アニメーションを表示。
4. 静止画はブラウザのスクショ、GIF は画面録画 → `ffmpeg` で変換（このリポジトリでは ffmpeg を使用）。
   - 例: 連番 PNG から `ffmpeg -framerate 12 -i f%03d.png -vf "scale=720:-1:flags=lanczos,palettegen" pal.png` → `paletteuse` で結合。

---

## 完了チェックリスト

- [ ] Vercel に frontend をデプロイし、`VITE_API_BASE_URL` を設定
- [ ] Render バックエンドの `ALLOWED_ORIGIN_REGEX` を更新して再デプロイ（既存デプロイがある場合）
- [ ] README 冒頭のライブデモリンクを実 URL に差し替え
- [ ] GitHub プロフィールで Tour-Rail を Pinned 先頭に
- [ ] （任意）プロフィール README にデモ URL を追加
