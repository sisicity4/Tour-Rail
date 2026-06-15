# AGENTS.md

このファイルは、リポジトリ探索の重複とトークン使用量を減らすための作業メモです。

## 最初に読むもの

- まずこのファイルを読む。
- 人間向けのセットアップ説明が必要な場合だけ [README.md](README.md) を読む。
- プロダクト仕様と構成は、必要に応じて次を参照する。
  - [docs/architecture.md](docs/architecture.md)
  - [docs/deployment.md](docs/deployment.md)

## リポジトリ構成

- `backend/`: FastAPI サービス
  - `main.py`: アプリ設定、CORS、`/health`、`/config`、`/route`
  - `schemas.py`: リクエスト・レスポンスモデル
  - `tests/test_main.py`: API 回帰テスト
- `frontend/`: Vite + React の静的サイト
  - `src/App.tsx`: 画面構成、旅行者数、移動手段、ルート作成状態
  - `src/components/MapBoard.tsx`: Leaflet 地図、スポットマーカー、移動アイコン
  - `src/api.ts`: バックエンド通信
  - `src/styles.css`: ビジュアルシステムと遊びのあるUI
- `docs/`: アーキテクチャ・デプロイ補足
- `render.yaml`: Render Blueprint

## プロダクト仕様

- コアコンセプト: ボードゲーム風の楽しい旅行ルートデモ。
- 用語は次に統一する。
  - 地図に置く点: `スポット`
  - APIから返る線: `ルート`
  - 人数: `旅行者数`
  - 動く表示: `移動アニメーション`
  - 乗り物や徒歩の選択: `移動手段`
- 主な利用フロー:
  1. 旅行者数を設定する
  2. 車・徒歩・自転車から移動手段を選ぶ
  3. 地図をクリックしてスタート、ゴール、寄り道スポットを置く
  4. バックエンドからルートを取得する
  5. 選択した移動手段アイコンをルート上で動かす
  6. ボード風カードで現在のスポットを確認する
- v1 では保存機能、ログイン、データベースは扱わない。

## 探索を減らす指針

- 構成が変わっていない限り、リポジトリ全体を再スキャンしない。
- 関連ファイルだけ読む。
  - UI調整: `frontend/src/App.tsx`, `frontend/src/styles.css`, `frontend/src/components/MapBoard.tsx`
  - API変更: `backend/main.py`, `backend/schemas.py`, `backend/tests/test_main.py`
  - デプロイ問題: `render.yaml`, `docs/deployment.md`
- 広いファイルダンプより、対象を絞った `rg` を優先する。
- 古いルート直下の React/FastAPI 試作ファイルがあっても、現在の本体は `frontend/` と `backend/` の分割構成として扱う。

## 検証コマンド

- バックエンド:
  - `cd backend && source .venv/bin/activate && python -m unittest discover -s tests`
- フロントエンド:
  - `cd frontend && npm run build`
- 変更範囲が狭い場合は、必要最小限の検証から実行する。

## 既知の方針

- Render は 2 サービス構成。
  - `tour-rail-api`
  - `tour-rail-web`
- CORS は localhost 系の開発URLと `*.onrender.com` / `*.vercel.app` を許可する。
- フロントエンドは `VITE_API_BASE_URL` からバックエンドURLを受け取る。
- UIは企業向けの無機質な見た目ではなく、意図的に遊びのある雰囲気を維持する。
