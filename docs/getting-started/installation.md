# Installation

The only supported installation path today is **Docker Compose**. Native installs (Python + node) work for development but aren't documented yet.

## Requirements

| Tool | Minimum | Notes |
|---|---|---|
| Docker Desktop / Engine | 4.x / 24.x | With Compose v2 |
| Disk | 2 GB free | Images + pgdata volume |
| RAM | 4 GB free | Backend + frontend + Postgres |
| Ports | `3000`, `5432`, `8000` | Remap in `docker-compose.yml` if taken |

## Clone

```bash
git clone https://github.com/<your-org>/next-gen-o11y-platform.git
cd next-gen-o11y-platform
```

## Boot

```bash
make docker-up
```

That's it. See [quick-start.md](quick-start.md) for what to do next.

## Native dev install (optional)

If you want to run the backend outside Docker (e.g. to use your IDE's Python debugger):

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Database — still via Docker
docker compose up -d db
alembic upgrade head

# Run
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` if your backend is on a non-default port.

## Verify

```bash
curl http://localhost:8000/api/v1/health
# {"status":"healthy","version":"1.0.0","timestamp":"..."}

curl http://localhost:8000/api/v1/integrations/ | jq 'length'
# 11

curl http://localhost:3000/ -o /dev/null -w '%{http_code}\n'
# 200
```

If any of those fail, see [troubleshooting.md](../guides/troubleshooting.md).
