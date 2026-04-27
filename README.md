# Tour-Rail

Tour-Rail is a travel-route showcase app with a board-game mood. Users place stops on a map, enter traveler counts for `male`, `female`, and `other`, then watch a car carry those groups across the route with a life-game style progress rail.

The repository is split for Render deployment:

- `backend/`: FastAPI API for health, route proxying, and frontend config
- `frontend/`: React + Vite static site

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend endpoints:

- `GET /health`
- `GET /config`
- `POST /route`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` when running against a non-default backend:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

The frontend defaults to `http://localhost:8000` in local development.

## Backend contract

### `GET /health`

Returns service status.

### `GET /config`

Returns default animation settings, category colors, and default map center.

### `POST /route`

Request:

```json
{
  "waypoints": [
    { "lat": 35.6812, "lng": 139.7671 },
    { "lat": 35.6895, "lng": 139.6917 }
  ]
}
```

Response includes:

- `path`: normalized coordinate list
- `waypoints`: original stops
- `distance_m`
- `duration_s`
- `segment_count`

## Render deployment

This repo includes a root `render.yaml` for a 2-service setup:

1. `tour-rail-api` as a Python `Web Service`
2. `tour-rail-web` as a `Static Site`

Render will inject the backend URL into the frontend as `VITE_API_BASE_URL`.

If you deploy manually instead of using the Blueprint:

- Backend root directory: `backend`
- Backend build command: `pip install -r requirements.txt`
- Backend start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Frontend root directory: `frontend`
- Frontend build command: `npm ci && npm run build`
- Frontend publish directory: `frontend/dist`

For SPA routing on Render Static Sites, keep the rewrite rule from `render.yaml`.

## Testing

### Backend

```bash
cd backend
python -m unittest discover -s tests
```

### Frontend

```bash
cd frontend
npm run build
```
