/* -------------------------------------------------------------------------- */
/*  Coverage & Adoption — 3-tab leadership cockpit                            */
/* -------------------------------------------------------------------------- */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Download,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  getCoverageByArchitect,
  getCoverageByLob,
  getCoverageByManager,
  getCoverageGaps,
  getCoverageSummary,
  getCoverageTrends,
  refreshCoverage,
  triggerCmdbSync,
} from '@/api/coverage';
import type {
  CMDBAppRecord,
  CoverageTrendPoint,
  LeadershipCoverageResponse,
  PortfolioCoverage,
  ScopeCoverage,
  SignalName,
  VpCoverage,
} from '@/types/coverage';

const SIGNAL_LABELS: Record<SignalName, string> = {
  metrics: 'Metrics',
  logs: 'Logs',
  traces: 'Traces',
  profiles: 'Profiles',
  faro: 'Faro',
  synthetics: 'Synthetics',
};

const SIGNAL_COLORS: Record<SignalName, string> = {
  metrics: '#2563eb',
  logs: '#16a34a',
  traces: '#9333ea',
  profiles: '#ea580c',
  faro: '#db2777',
  synthetics: '#0891b2',
};

type TabKey = 'overview' | 'by-scope' | 'gaps';

export default function CoveragePage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [summary, setSummary] = useState<LeadershipCoverageResponse | null>(null);
  const [trends, setTrends] = useState<CoverageTrendPoint[]>([]);
  const [gaps, setGaps] = useState<CMDBAppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, t, g] = await Promise.all([
        getCoverageSummary(),
        getCoverageTrends(90),
        getCoverageGaps(),
      ]);
      setSummary(s);
      setTrends(t);
      setGaps(g.items);
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Failed to load coverage data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      // If no apps yet, bootstrap via CMDB sync first.
      if (!summary || summary.global.total_apps === 0) {
        await triggerCmdbSync();
      }
      await refreshCoverage();
      await loadAll();
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Refresh failed.';
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="page-eyebrow">
            <Target className="h-3 w-3" strokeWidth={3} />
            Leadership cockpit
          </div>
          <h1 className="page-title">Coverage &amp; Adoption</h1>
          <p className="page-subtitle">
            Reconciliation of the CMDB source of truth against live LGTM
            ingestion. Pre-aggregated daily so leadership views load in under
            500&nbsp;ms.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing…' : 'Refresh coverage'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {(
            [
              ['overview', 'Leadership Overview'],
              ['by-scope', 'By Portfolio / VP / Manager / Architect'],
              ['gaps', 'App-level Gaps'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Could not load coverage data</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={loadAll}
                className="mt-2 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !summary && <LoadingSkeleton />}

      {/* Content */}
      {summary && tab === 'overview' && (
        <OverviewTab summary={summary} trends={trends} gapsCount={gaps.length} />
      )}
      {summary && tab === 'by-scope' && <ByScopeTab summary={summary} />}
      {summary && tab === 'gaps' && <GapsTab gaps={gaps} />}
    </div>
  );
}

/* ── Tab 1 — Leadership Overview ─────────────────────────────────────── */

function OverviewTab({
  summary,
  trends,
  gapsCount,
}: {
  summary: LeadershipCoverageResponse;
  trends: CoverageTrendPoint[];
  gapsCount: number;
}) {
  const g = summary.global;
  const totalApps = g.total_apps;
  const onboardedAny = g.apps_onboarded_any;
  const fullStack = Math.round((g.coverage_pct_full_stack / 100) * totalApps);
  const gapCount = gapsCount;

  const signalTotals = g.per_signal;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Apps (CMDB)"
          value={totalApps}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="Onboarded (any signal)"
          value={onboardedAny}
          sub={`${g.coverage_pct_any.toFixed(1)}% coverage`}
          icon={<Activity className="h-5 w-5" />}
          tone={g.coverage_pct_any >= 70 ? 'green' : 'amber'}
        />
        <StatCard
          label="Full-stack observable"
          value={fullStack}
          sub={`${g.coverage_pct_full_stack.toFixed(1)}% of CMDB`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={g.coverage_pct_full_stack >= 50 ? 'green' : 'amber'}
        />
        <StatCard
          label="Gap"
          value={gapCount}
          sub="Apps with zero signals"
          icon={<TrendingDown className="h-5 w-5" />}
          tone={gapCount === 0 ? 'green' : 'red'}
        />
      </div>

      {/* Trendline */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Coverage trend (last 90 days)
          </h2>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-blue-600" /> Any signal
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-emerald-600" /> Full-stack
            </span>
          </div>
        </div>
        <TrendChart points={trends} />
      </div>

      {/* Signal-wise coverage */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Per-signal adoption
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {signalTotals.map((sc) => (
            <div
              key={sc.signal}
              className="rounded-md border border-slate-100 bg-slate-50/50 p-3"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {SIGNAL_LABELS[sc.signal]}
                </span>
                <span className="text-slate-500">
                  {sc.onboarded}/{sc.total_apps}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${sc.coverage_pct}%`,
                    background: SIGNAL_COLORS[sc.signal],
                  }}
                />
              </div>
              <div className="mt-1 text-right text-xs text-slate-500">
                {sc.coverage_pct.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 2 — By Portfolio / VP / Manager / Architect ─────────────────── */

function ByScopeTab({ summary }: { summary: LeadershipCoverageResponse }) {
  const [scope, setScope] = useState<
    'portfolio' | 'vp' | 'manager' | 'architect' | 'lob'
  >('portfolio');
  const [scopeRows, setScopeRows] = useState<ScopeCoverage[]>([]);

  useEffect(() => {
    const load = async () => {
      if (scope === 'manager') setScopeRows(await getCoverageByManager());
      else if (scope === 'architect') setScopeRows(await getCoverageByArchitect());
      else if (scope === 'lob') setScopeRows(await getCoverageByLob());
      else setScopeRows([]);
    };
    load();
  }, [scope]);

  const rows = useMemo(() => {
    if (scope === 'portfolio') return summary.portfolios;
    if (scope === 'vp') return summary.vps;
    return scopeRows;
  }, [scope, summary, scopeRows]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scope
        </div>
        {(
          [
            ['portfolio', 'Portfolio'],
            ['vp', 'VP'],
            ['manager', 'Manager'],
            ['architect', 'Architect'],
            ['lob', 'Line of Business'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              scope === key
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </aside>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ScopeTable scope={scope} rows={rows as unknown[]} />
      </div>
    </div>
  );
}

function ScopeTable({
  scope,
  rows,
}: {
  scope: string;
  rows: unknown[];
}) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        No data yet. Click <strong>Refresh coverage</strong> above to run the
        probes.
      </div>
    );
  }

  const getScopeName = (r: unknown): string => {
    const row = r as Record<string, unknown>;
    if (scope === 'portfolio') return (row.portfolio as string) ?? '—';
    if (scope === 'vp') return (row.vp_name as string) ?? (row.vp_email as string) ?? '—';
    return (row.scope_key as string) ?? '—';
  };

  const getTotal = (r: unknown): number => (r as { total_apps: number }).total_apps ?? 0;
  const getOnboarded = (r: unknown): number => {
    const row = r as Record<string, number>;
    return row.onboarded ?? row.apps_onboarded_any ?? 0;
  };
  const getPct = (r: unknown): number =>
    (r as { coverage_pct_any: number }).coverage_pct_any ?? 0;

  const sorted = [...rows].sort((a, b) => getPct(a) - getPct(b));
  const worstSet = new Set(sorted.slice(0, 10));

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">{scope === 'portfolio' ? 'Portfolio' : scope === 'vp' ? 'VP' : 'Scope'}</th>
          <th className="px-4 py-3">Total apps</th>
          <th className="px-4 py-3">Onboarded</th>
          <th className="px-4 py-3">Gap</th>
          <th className="px-4 py-3">Coverage</th>
          <th className="px-4 py-3">Per signal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sorted.map((r, i) => {
          const name = getScopeName(r);
          const total = getTotal(r);
          const onboarded = getOnboarded(r);
          const gap = total - onboarded;
          const pct = getPct(r);
          const isWorst = worstSet.has(r);
          const perSignal = (r as { per_signal?: { signal: SignalName; coverage_pct: number }[] }).per_signal ?? [];
          return (
            <tr
              key={i}
              className={isWorst ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}
            >
              <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
              <td className="px-4 py-3 text-slate-700">{total}</td>
              <td className="px-4 py-3 text-slate-700">{onboarded}</td>
              <td className="px-4 py-3 text-slate-700">{gap}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80
                          ? 'bg-emerald-600'
                          : pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {perSignal.map((ps) => (
                    <div
                      key={ps.signal}
                      title={`${SIGNAL_LABELS[ps.signal]}: ${ps.coverage_pct.toFixed(0)}%`}
                      className="h-4 w-4 rounded-sm"
                      style={{
                        background: SIGNAL_COLORS[ps.signal],
                        opacity: Math.max(0.15, ps.coverage_pct / 100),
                      }}
                    />
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── Tab 3 — App-level Gap List ──────────────────────────────────────── */

function GapsTab({ gaps }: { gaps: CMDBAppRecord[] }) {
  const navigate = useNavigate();
  const [portfolioFilter, setPortfolioFilter] = useState<string>('');
  const portfolios = useMemo(
    () => Array.from(new Set(gaps.map((g) => g.portfolio))).sort(),
    [gaps],
  );
  const filtered = portfolioFilter
    ? gaps.filter((g) => g.portfolio === portfolioFilter)
    : gaps;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Portfolio:</label>
        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All ({gaps.length})</option>
          {portfolios.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          Showing {filtered.length} apps with zero onboarded signals
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No coverage gaps — every app has at least one signal onboarded.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">App</th>
                <th className="px-4 py-3">Portfolio</th>
                <th className="px-4 py-3">VP</th>
                <th className="px-4 py-3">Criticality</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {app.app_name}
                    </div>
                    <div className="text-xs text-slate-500">{app.app_code}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{app.portfolio}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {app.vp_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        app.business_criticality === 'tier_1'
                          ? 'bg-red-100 text-red-800'
                          : app.business_criticality === 'tier_2'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {app.business_criticality ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{app.region ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/onboarding/new?app_code=${app.app_code}`)
                      }
                      className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Start onboarding
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Shared components ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red';
}) {
  const toneClasses = {
    neutral: 'text-slate-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon && <span className={toneClasses}>{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-bold ${toneClasses}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function TrendChart({ points }: { points: CoverageTrendPoint[] }) {
  const width = 720;
  const height = 180;
  const padding = 24;

  if (points.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-slate-400">
        No historical snapshots yet. The daily rollup job runs at 02:30 UTC.
      </div>
    );
  }

  const maxY = 100;
  const xStep =
    (width - padding * 2) / Math.max(1, points.length - 1);

  const toPath = (key: 'coverage_pct_any' | 'coverage_pct_full_stack') =>
    points
      .map((p, i) => {
        const x = padding + i * xStep;
        const y = padding + ((maxY - p[key]) / maxY) * (height - padding * 2);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 25, 50, 75, 100].map((y) => {
        const yPos = padding + ((maxY - y) / maxY) * (height - padding * 2);
        return (
          <g key={y}>
            <line
              x1={padding}
              x2={width - padding}
              y1={yPos}
              y2={yPos}
              stroke="#e2e8f0"
              strokeDasharray="2 2"
            />
            <text
              x={padding - 6}
              y={yPos + 3}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="end"
            >
              {y}
            </text>
          </g>
        );
      })}
      <path
        d={toPath('coverage_pct_any')}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
      />
      <path
        d={toPath('coverage_pct_full_stack')}
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
      />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
      <div className="h-60 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
    </div>
  );
}
