import { Link, useParams, Navigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import {
  RETAIL_PORTFOLIOS,
  PILLARS,
  overallPct,
  portfolioPillarAvg,
  appStatus,
  type PillarCoverage,
} from './data';

/* ── helpers ──────────────────────────────────────────────────────────────── */

function pctColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct > 0)   return '#dc2626';
  return '#9ca3af';
}

function PctCell({ pct }: { pct: number }) {
  const color = pctColor(pct);
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
      <span className="text-xs font-bold font-mono" style={{ color }}>
        {pct}%
      </span>
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: 'rgb(var(--surface-tertiary))' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function PillarSummaryCard({
  label,
  fullLabel,
  value,
}: {
  label: string;
  fullLabel: string;
  value: number;
}) {
  const color = pctColor(value);
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: 'rgb(var(--surface-secondary))' }}
      title={fullLabel}
    >
      <div className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color }}>
        {value}%
      </div>
      <div
        className="mt-1.5 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgb(var(--surface-tertiary))' }}
      >
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── component ────────────────────────────────────────────────────────────── */

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const portfolio = RETAIL_PORTFOLIOS.find(p => p.id === id);

  if (!portfolio) return <Navigate to="/portfolios" replace />;

  const portfolioAvg  = portfolioPillarAvg(portfolio.apps);
  const overallAvgPct = overallPct(portfolioAvg);
  const complete      = portfolio.apps.filter(a => appStatus(a.pillars) === 'complete').length;
  const inProg        = portfolio.apps.filter(a => appStatus(a.pillars) === 'in_progress').length;
  const notStart      = portfolio.apps.length - complete - inProg;

  return (
    <div className="space-y-6 p-6">

      {/* ── BREADCRUMB ──────────────────────────────────────────────────── */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Breadcrumb">
        <Link
          to="/"
          className="transition-colors hover:underline"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          O11y Platform
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
        <Link
          to="/portfolios"
          className="transition-colors hover:underline"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          Portfolios
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
        <span className="font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
          {portfolio.name}
        </span>
      </nav>

      {/* ── PORTFOLIO HEADER CARD ────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: 'rgb(var(--border-color))',
          background: 'rgb(var(--surface-primary))',
          borderLeftWidth: '4px',
          borderLeftColor: portfolio.accent,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: icon + name */}
          <div className="flex items-center gap-4">
            <span className="text-4xl">{portfolio.icon}</span>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                {portfolio.name}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                {portfolio.description}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                Owner: <span className="font-medium">{portfolio.owner}</span>
              </p>
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex flex-wrap gap-4 text-center">
            {[
              { label: 'Overall', value: `${overallAvgPct}%`, color: portfolio.accent },
              { label: 'Apps',     value: `${portfolio.apps.length}`, color: 'rgb(var(--text-primary))' },
              { label: 'Complete', value: `${complete}`,       color: '#16a34a' },
              { label: 'In Progress', value: `${inProg}`,      color: '#d97706' },
              { label: 'Pending',  value: `${notStart}`,       color: '#9ca3af' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio pillar averages */}
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PILLARS.map(p => (
            <PillarSummaryCard
              key={p.key}
              label={p.label}
              fullLabel={p.fullLabel}
              value={portfolioAvg[p.key]}
            />
          ))}
        </div>
      </div>

      {/* ── LEGEND ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
        <span className="font-semibold">Pillar coverage:</span>
        {PILLARS.map(p => (
          <span key={p.key} className="flex items-center gap-1">
            <span className="font-bold">{p.key}</span>
            <span>= {p.fullLabel}</span>
          </span>
        ))}
        <span className="ml-2 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-500" />≥ 80% good</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" />50–79% partial</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" />1–49% started</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-gray-300" />0% not started</span>
        </span>
      </div>

      {/* ── APPS TABLE ──────────────────────────────────────────────────── */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: 'rgb(var(--border-color))' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: 'rgb(var(--surface-secondary))',
                borderBottom: '1px solid rgb(var(--border-color))',
              }}
            >
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                App / Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                Tech Stack
              </th>
              {PILLARS.map(p => (
                <th
                  key={p.key}
                  className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: 'rgb(var(--text-muted))' }}
                  title={p.fullLabel}
                >
                  {p.key}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                Overall
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: 'rgb(var(--text-muted))' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {portfolio.apps.map((app, idx) => {
              const overall = overallPct(app.pillars);
              const status  = appStatus(app.pillars);
              const isEven  = idx % 2 === 0;

              return (
                <tr
                  key={app.id}
                  style={{
                    borderBottom:
                      idx < portfolio.apps.length - 1
                        ? '1px solid rgb(var(--border-color))'
                        : undefined,
                    background: isEven
                      ? 'rgb(var(--surface-primary))'
                      : 'rgb(var(--surface-secondary) / 0.4)',
                  }}
                >
                  {/* App name + tier badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                          app.tier === 1
                            ? 'bg-red-100 text-red-700'
                            : app.tier === 2
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title={`Tier ${app.tier}`}
                      >
                        T{app.tier}
                      </span>
                      <code
                        className="font-mono text-xs"
                        style={{ color: 'rgb(var(--text-primary))' }}
                      >
                        {app.name}
                      </code>
                    </div>
                  </td>

                  {/* Team */}
                  <td
                    className="px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: 'rgb(var(--text-secondary))' }}
                  >
                    {app.team}
                  </td>

                  {/* Tech */}
                  <td
                    className="px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: 'rgb(var(--text-muted))' }}
                  >
                    {app.tech}
                  </td>

                  {/* Pillar cells */}
                  {PILLARS.map(p => (
                    <td key={p.key} className="px-3 py-3">
                      <PctCell pct={app.pillars[p.key]} />
                    </td>
                  ))}

                  {/* Overall */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-sm font-bold"
                      style={{ color: pctColor(overall) }}
                    >
                      {overall}%
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          status === 'complete'
                            ? 'bg-green-500'
                            : status === 'in_progress'
                            ? 'bg-yellow-400'
                            : 'bg-gray-400'
                        }`}
                      />
                      {status === 'complete'
                        ? 'Complete'
                        : status === 'in_progress'
                        ? 'In Progress'
                        : 'Not Started'}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      to={`/onboarding/new?app=${app.id}&portfolio=${portfolio.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{
                        color: 'rgb(var(--brand-600))',
                        background: 'rgb(var(--brand-50))',
                      }}
                    >
                      {status === 'not_started' ? 'Onboard' : 'Update'}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
