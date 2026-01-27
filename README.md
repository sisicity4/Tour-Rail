# null-health-demo

FastAPIで「運動できなかった理由（null）」を記録し、理由に応じた最小の介入（10〜30秒の行動）を返すデモAPIです。成果指標は「0→1（空白が埋まった回数）」のみを扱います。

## 使い方

### 1) 依存関係のインストール
```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
```

### 2) 起動
```bash
uvicorn main:app --reload
```

起動後、`http://localhost:8000/docs` でSwagger UIを確認できます。

## API使用例（curl）

### 1) ヘルスチェック
```bash
curl http://localhost:8000/health
```

### 2) 今日のチェックイン（did_move=0 + reason必須）
```bash
curl -X POST http://localhost:8000/checkins \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","did_move":false,"reason":"tired","hour_bucket":"evening"}'
```

### 3) 次の介入を取得
```bash
curl "http://localhost:8000/fix/next?user_id=u1"
```

### 4) 介入を実行したら完了報告
```bash
curl -X POST http://localhost:8000/fixes/1/done
```

### 5) 今日の統計
```bash
curl "http://localhost:8000/stats/today?user_id=u1"
```

### 6) 直近7日サマリー
```bash
curl "http://localhost:8000/stats/summary?user_id=u1&days=7"
```

## 典型フロー
1. `/checkins` に `did_move=false` で理由を送信
2. `/fix/next` で理由に応じた介入を取得（提案ログが保存される）
3. 実行できたら `/fixes/{id}/done` で完了報告
4. `/stats/today` の `filled` が「空白が埋まった回数」

## データモデル
- checkins
  - id, user_id, date, did_move, reason, hour_bucket, created_at
- fixes
  - id, user_id, checkin_id, fix_id, fix_title, level, did_fix, created_at
