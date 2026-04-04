import { Link } from 'react-router-dom';
import { ChevronRight, Layers } from 'lucide-react';
import {
  RETAIL_PORTFOLIOS,
  PILLARS,
  portfolioPillarAvg,
  overallPct,
  appStatus,
} from './data';

/* ── helpers ──────────────────────────────────────────────────────────────── */

function pctColor(pct: number) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct > 0)   return '#dc2626';
  return '#9ca3af';
}

/* ── component ────────────────────────────────────────────────────────────── */

export default function PortfolioList() {
  const totalApps = RETAIL_PORTFOLIOS.reduce((n, p) => n + p.apps.length, 0);

  const platformAvg = Math.round(
    RETAIL_PORTFOLIOS.reduce((sum, p) => {
      return sum + overallPct(portfolioPillarAvg(p.apps));
    }, 0) / RETAIL_PORTFOLIOS.length,
  );

  return (
    <div className="space-y-6 p-6">

      {/* ── BREADCRUMB ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
        <Link
          to="/"
          className="transition-colors hover:underline"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          O11y Platform
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
        <span className="font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
          Portfolios
        </span>
      </nav>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
              Retail Portfolios
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              O11y onboarding coverage · {RETAIL_PORTFOLIOS.length} portfolios · {totalApps} applications
            </p>
          </div>
        </div>

        {/* Platform-wide summary pills */}
        <div className="flex flex-wrap gap-3">
          <div
            className="rounded-xl border px-5 py-3 text-center"
            style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-secondary))' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
              {RETAIL_PORTFOLIOS.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Portfolios</div>
          </div>
          <div
            className="rounded-xl border px-5 py-3 text-center"
            style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-secondary))' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
              {totalApps}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Applications</div>
          </div>
          <div
            className="rounded-xl border px-5 py-3 text-center"
            style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-secondary))' }}
          >
            <div className="text-2xl font-bold" style={{ color: pctColor(platformAvg) }}>
              {platformAvg}%
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Platform Avg</div>
          </div>
        </div>
      </div>

      {/* ── PILLAR PLATFORM SUMMARY ──────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>
          Platform-wide pillar averages
        </p>
        <div className="grid grid-cols-6 gap-3">
          {PILLARS.map(p => {
            const avg = Math.round(
              RETAIL_PORTFOLIOS.reduce((sum, port) => {
                return sum + portfolioPillarAvg(port.apps)[p.key];
              }, 0) / RETAIL_PORTFOLIOS.length,
            );
            return (
              <div key={p.key} className="text-center">
                <div className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {p.label}
                </div>
                <div className="text-xl font-bold" style={{ color: pctColor(avg) }}>
                  {avg}%
                </div>
                <div
                  className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgb(var(--surface-tertiary))' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${avg}%`, backgroundColor: pctColor(avg) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PORTFOLIO GRID ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RETAIL_PORTFOLIOS.map(portfolio => {
          const avg       = portfolioPillarAvg(portfolio.apps);
          const overall   = overallPct(avg);
          const complete  = portfolio.apps.filter(a => appStatus(a.pillars) === 'complete').length;
          const inProg    = portfolio.apps.filter(a => appStatus(a.pillars) === 'in_progress').length;
          const notStart  = portfolio.apps.length - complete - inProg;

          return (
            <Link
              key={portfolio.id}
              to={`/portfolios/${portfolio.id}`}
              className="group relative rounded-xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderColor: 'rgb(var(--border-color))',
                background: 'rgb(var(--surface-primary))',
                borderLeftWidth: '4px',
                borderLeftColor: portfolio.accent,
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{portfolio.icon}</span>
                  <div className="min-w-0">
                    <h2
                      className="truncate text-sm font-semibold group-hover:underline"
                      style={{ color: 'rgb(var(--text-primary))' }}
                    >
                      {portfolio.name}
                    </h2>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                      {portfolio.owner}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-bold" style={{ color: portfolio.accent }}>
                    {overall}%
                  </span>
                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>overall</p>
                </div>
              </div>

              {/* Overall progress bar */}
              <div
                className="mt-3 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgb(var(--surface-tertiary))' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${overall}%`, background: portfolio.accent }}
                />
              </div>

              {/* Per-pillar mini bars */}
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {PILLARS.map(p => {
                  const v = avg[p.key];
                  return (
                    <div key={p.key} className="text-center" title={`${p.fullLabel}: ${v}%`}>
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: 'rgb(var(--text-muted))' }}
                      >
                        {p.key}
                      </div>
                      <div
                        className="my-1 h-1 rounded-full overflow-hidden"
                        style={{ background: 'rgb(var(--surface-tertiary))' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${v}%`, backgroundColor: pctColor(v) }}
                        />
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: pctColor(v) }}
                      >
                        {v}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer: app count + status dots */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  {portfolio.apps.length} apps
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {complete} done
                  </span>
                  {inProg > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                      {inProg}
                    </span>
                  )}
                  {notStart > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      {notStart}
                    </span>
                  )}
                </div>
              </div>

              {/* Hover arrow */}
              <ChevronRight
                className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: portfolio.accent }}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
