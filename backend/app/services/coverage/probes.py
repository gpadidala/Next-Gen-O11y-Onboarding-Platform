"""All LGTM coverage probes in one module.

Each probe reads the current set of apps from ``application_metadata``,
determines for its signal whether each app is actively ingesting, and
upserts the result into ``lgtm_app_coverage``.

In development / test (``PROBE_USE_MOCK=True``), probes use a deterministic
per-app hash to decide which apps are "onboarded" for the given signal, so
the coverage view looks realistic without needing real Mimir/Loki/Tempo/etc.

Real probes (``PROBE_USE_MOCK=False``) are stubbed to raise — integrators
plug in HTTP calls against the configured ``*_BASE_URL``.
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.application import ApplicationMetadata
from app.models.coverage import LgtmAppCoverage, SyntheticUrl
from app.services.integration_service import resolve_integration

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# Each probe has a target "onboarding fraction" — what % of apps we want
# to appear onboarded for that signal in the mock. Tuned to produce a
# realistic, imbalanced coverage view.
MOCK_ONBOARDING_FRACTION: dict[str, float] = {
    "metrics": 0.85,
    "logs": 0.78,
    "traces": 0.55,
    "profiles": 0.20,
    "faro": 0.18,
    "synthetics": 0.35,
}


# Apps whose per-app hash falls below this threshold are "dark": no signals
# at all, simulating the un-onboarded gap pool the Coverage dashboard should
# highlight. Tuned so ~30% of CMDB apps land in the gap list.
_DARK_APP_FRACTION: float = 0.30


def _app_is_dark(app_code: str) -> bool:
    h = hashlib.sha1(f"dark:{app_code}".encode()).hexdigest()
    value = int(h[:8], 16) / 0xFFFFFFFF
    return value < _DARK_APP_FRACTION


def _deterministic_is_onboarded(app_code: str, signal: str, fraction: float) -> bool:
    """Hash-based onboarding decision — stable across runs for the same input."""
    if _app_is_dark(app_code):
        return False
    h = hashlib.sha1(f"{app_code}:{signal}".encode()).hexdigest()
    value = int(h[:8], 16) / 0xFFFFFFFF
    return value < fraction


def _mock_volume(app_code: str, signal: str) -> dict:
    """Generate a deterministic volume metric for an onboarded app+signal."""
    rng = random.Random(f"{app_code}:{signal}")
    if signal == "metrics":
        return {"active_series_count": rng.randint(500, 12000)}
    if signal == "logs":
        return {"log_volume_bytes_per_day": rng.randint(100_000_000, 20_000_000_000)}
    if signal == "traces":
        return {"span_rate_per_sec": round(rng.uniform(5.0, 500.0), 2)}
    if signal == "profiles":
        return {"profile_rate_per_sec": round(rng.uniform(0.5, 20.0), 2)}
    if signal == "faro":
        return {"faro_sessions_per_day": rng.randint(50, 8000)}
    if signal == "synthetics":
        return {"synthetics_url_count": rng.randint(1, 8)}
    return {}


@dataclass
class ProbeResult:
    signal: str
    apps_onboarded: int
    apps_total: int
    source: str


async def _upsert_coverage_row(
    db: AsyncSession,
    *,
    app_code: str,
    signal: str,
    is_onboarded: bool,
    volume: dict,
    source_probe: str,
) -> None:
    now = datetime.now(timezone.utc)
    values = {
        "app_code": app_code,
        "signal": signal,
        "is_onboarded": is_onboarded,
        "last_sample_at": now if is_onboarded else None,
        "source_probe": source_probe,
        "collected_at": now,
        "active_series_count": None,
        "log_volume_bytes_per_day": None,
        "span_rate_per_sec": None,
        "profile_rate_per_sec": None,
        "faro_sessions_per_day": None,
        "synthetics_url_count": None,
    }
    if is_onboarded:
        values.update(volume)

    stmt = pg_insert(LgtmAppCoverage).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["app_code", "signal"],
        set_={
            "is_onboarded": stmt.excluded.is_onboarded,
            "last_sample_at": stmt.excluded.last_sample_at,
            "source_probe": stmt.excluded.source_probe,
            "collected_at": stmt.excluded.collected_at,
            "active_series_count": stmt.excluded.active_series_count,
            "log_volume_bytes_per_day": stmt.excluded.log_volume_bytes_per_day,
            "span_rate_per_sec": stmt.excluded.span_rate_per_sec,
            "profile_rate_per_sec": stmt.excluded.profile_rate_per_sec,
            "faro_sessions_per_day": stmt.excluded.faro_sessions_per_day,
            "synthetics_url_count": stmt.excluded.synthetics_url_count,
            "updated_at": now,
        },
    )
    await db.execute(stmt)


_SIGNAL_TO_TARGET: dict[str, str] = {
    "metrics": "mimir",
    "logs": "loki",
    "traces": "tempo",
    "profiles": "pyroscope",
    "faro": "faro",
    "synthetics": "blackbox",
}


async def _run_signal_probe(
    db: AsyncSession,
    settings: Settings,
    *,
    signal: str,
    source_probe: str,
) -> ProbeResult:
    result = await db.execute(
        select(ApplicationMetadata.app_code).where(
            ApplicationMetadata.retired.is_(False)
        )
    )
    app_codes = [row[0] for row in result.all()]
    if not app_codes:
        return ProbeResult(signal=signal, apps_onboarded=0, apps_total=0, source=source_probe)

    # Resolve the per-target integration config (DB first, env fallback).
    target_key = _SIGNAL_TO_TARGET.get(signal)
    use_mock = settings.PROBE_USE_MOCK
    if target_key:
        try:
            cfg = await resolve_integration(db, target_key)
            use_mock = cfg.use_mock
            if not cfg.is_enabled:
                logger.info("probe_skipped_disabled", signal=signal, target=target_key)
                return ProbeResult(
                    signal=signal,
                    apps_onboarded=0,
                    apps_total=len(app_codes),
                    source=source_probe,
                )
        except Exception:  # noqa: BLE001
            logger.exception("probe_config_resolve_failed", signal=signal)

    if not use_mock:
        logger.warning("probe_real_mode_not_implemented", signal=signal)
        return ProbeResult(signal=signal, apps_onboarded=0, apps_total=len(app_codes), source=source_probe)

    fraction = MOCK_ONBOARDING_FRACTION.get(signal, 0.5)
    onboarded_count = 0
    for code in app_codes:
        is_on = _deterministic_is_onboarded(code, signal, fraction)
        volume = _mock_volume(code, signal) if is_on else {}
        await _upsert_coverage_row(
            db,
            app_code=code,
            signal=signal,
            is_onboarded=is_on,
            volume=volume,
            source_probe=source_probe,
        )
        if is_on:
            onboarded_count += 1

    # Synthetics probe additionally seeds synthetic_urls rows for each onboarded app.
    if signal == "synthetics":
        await _seed_synthetic_urls(db, app_codes)

    return ProbeResult(
        signal=signal,
        apps_onboarded=onboarded_count,
        apps_total=len(app_codes),
        source=source_probe,
    )


async def _seed_synthetic_urls(db: AsyncSession, app_codes: list[str]) -> None:
    """For each onboarded synthetics app, upsert 1–3 URL rows."""
    now = datetime.now(timezone.utc)
    fraction = MOCK_ONBOARDING_FRACTION["synthetics"]
    for code in app_codes:
        if not _deterministic_is_onboarded(code, "synthetics", fraction):
            continue
        rng = random.Random(f"urls:{code}")
        count = rng.randint(1, 4)
        for idx in range(count):
            url = f"https://{code.lower()}.internal/health{idx}"
            module = rng.choice(["http_2xx", "http_post_2xx", "tcp_connect"])
            stmt = pg_insert(SyntheticUrl).values(
                app_code=code,
                url=url,
                module=module,
                region=rng.choice(["na", "emea", "apac"]),
                interval_seconds=rng.choice([30, 60, 120]),
                is_active=True,
                last_success_at=now,
                last_probe_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["app_code", "url", "module"],
                set_={
                    "last_success_at": now,
                    "last_probe_at": now,
                    "is_active": True,
                    "updated_at": now,
                },
            )
            await db.execute(stmt)


# ── Individual probes (cron-job entry points) ────────────────────────────


async def mimir_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(db, settings, signal="metrics", source_probe="mimir_api")


async def loki_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(db, settings, signal="logs", source_probe="loki_api")


async def tempo_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(db, settings, signal="traces", source_probe="tempo_api")


async def pyroscope_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(
        db, settings, signal="profiles", source_probe="pyroscope_api"
    )


async def faro_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(db, settings, signal="faro", source_probe="faro_api")


async def blackbox_probe(db: AsyncSession, settings: Settings) -> ProbeResult:
    return await _run_signal_probe(
        db, settings, signal="synthetics", source_probe="blackbox_config"
    )


async def run_all_probes(db: AsyncSession, settings: Settings) -> list[ProbeResult]:
    results: list[ProbeResult] = []
    for probe in (
        mimir_probe,
        loki_probe,
        tempo_probe,
        pyroscope_probe,
        faro_probe,
        blackbox_probe,
    ):
        results.append(await probe(db, settings))
    return results
