# Troubleshooting

## Backend won't start

### Port 8000 already in use

```
Error: Bind for 0.0.0.0:8000 failed: port is already allocated
```

Edit `docker-compose.yml` → `services.backend.ports` → change `"8000:8000"` to a free host port. The backend's CORS allowlist already covers common remaps.

### Port 5432 already in use

Most likely another local Postgres. Either stop it (`brew services stop postgresql@16` on macOS) or remap:

```yaml
# docker-compose.yml
  db:
    ports:
      - "5433:5432"
```

The backend inside the compose network still reaches Postgres on the internal port `5432`, so the remap only affects host access.

### Alembic "target database is not up to date"

```bash
docker compose exec backend alembic current
docker compose exec backend alembic upgrade head
```

If downgrade is needed: `alembic downgrade -1` then `alembic upgrade head`.

### `MissingGreenlet: greenlet_spawn has not been called`

SQLAlchemy async session touched a lazy attribute outside an async context. Usually happens when you `return` a model instance after a `flush()` without a `refresh()`. Fix: `await session.refresh(row)` before touching server-default columns like `updated_at`.

## Frontend won't load

### "Unable to reach the server" error banner

CORS. The browser's `Origin` header isn't in the backend's `CORS_ORIGINS_STR` allowlist. Default list covers `localhost:3000`, `3001`, `3002`, `5173`, `5174`. If your frontend is on a different port, either remap back to a covered port or set the env var:

```yaml
# docker-compose.yml
  backend:
    environment:
      CORS_ORIGINS_STR: http://localhost:3000,http://localhost:8080
```

Then `docker compose up -d backend` to recreate with the new env.

### Vite dev server shows old code

Hard refresh: **Cmd+Shift+R** (macOS) or **Ctrl+Shift+R** (Windows/Linux). Vite HMR is aggressive but `index.html` changes (e.g. Google Fonts links) require a full reload.

### `npm install` fails inside the container

```bash
docker compose up -d --build frontend
```

Forces a clean rebuild.

## Probes return empty / zero apps

### CMDB sync hasn't run

Integrations page → CMDB card → **Run probe**. Or via API:

```bash
curl -X POST http://localhost:8000/api/v1/cmdb/sync
```

Verify:

```bash
curl 'http://localhost:8000/api/v1/cmdb/apps?page_size=5' | jq '.total'
# 60
```

### Coverage probes run but coverage page is empty

Coverage rollups are computed nightly at 02:30 UTC, OR on first API call of the day via `_ensure_today_rollup`. Force a rebuild:

```bash
curl -X POST http://localhost:8000/api/v1/coverage/refresh
```

Verify:

```bash
curl http://localhost:8000/api/v1/coverage/summary | jq '.global'
```

### Probe runs but `items_onboarded` is 0

Check if the card is in live mode with an unreachable base URL. Either:

- Flip `use_mock` back on via the edit form
- Or point at a real upstream and test connectivity

The real-mode branch is a stub for every target except Mimir reachability — see [features/capacity.md § Real-mode status](../features/capacity.md).

## Docker Desktop file sharing (macOS)

If you enable the commented bind mount in `docker-compose.yml` for backend hot-reload:

```yaml
  backend:
    volumes:
      - ./backend/app:/app/app
```

...and get `mkdir /host_mnt/Volumes/Gopalmac: file exists`, add the repo's parent directory to **Docker Desktop → Settings → Resources → File Sharing → +**.

The default workflow doesn't need this — the Dockerfile copies the code at build time, so editing and rebuilding works without the mount.

## Tests failing

### 12 pre-existing failures in `test_onboarding.py` / `test_governance.py`

These predate the v2 work. They're contract drift against the current onboarding API surface. **They do not block v2 functionality.** Run only the v2 suite to verify nothing regressed:

```bash
cd backend
python -m pytest tests/test_api/test_v2_pipeline.py -v
```

Should be 22 passing, ~8 seconds.

### `DeprecationWarning: asyncio_default_fixture_loop_scope`

Harmless — pytest-asyncio future-default nudge. Add `asyncio_default_fixture_loop_scope = "function"` to `[tool.pytest.ini_options]` in `pyproject.toml` to silence.

## Performance

### Leadership cockpit slow

Should load in under 500ms. If it doesn't:

1. Check the rollup table has today's snapshot:
   ```sql
   SELECT scope_type, count(*) FROM coverage_rollup_snapshots
   WHERE snapshot_date = current_date GROUP BY scope_type;
   ```
2. Expected: 1 global + N portfolios + N vps + N managers + N architects + N lobs
3. If empty, the backend had an error during `_ensure_today_rollup` — check `docker compose logs backend`

### Probes taking forever

Each coverage probe scans all non-retired apps. For 60 apps it's <100ms. For 5,000+ apps you'll want to:

1. Batch the upserts (probes currently issue one INSERT per app)
2. Add an `app_code` IN clause to avoid iterating on each app
3. Consider running probes as background APScheduler jobs instead of inline during `/coverage/refresh`

## When all else fails

```bash
make docker-clean     # nuke everything
make docker-up        # rebuild from scratch
```

And check the logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```
