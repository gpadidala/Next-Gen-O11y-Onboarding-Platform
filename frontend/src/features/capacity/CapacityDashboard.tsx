/* -------------------------------------------------------------------------- */
/*  Capacity Planning — live per-component LGTM stack view                   */
/* -------------------------------------------------------------------------- */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Database,
  FileText,
  Gauge,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  getCapacityStack,
  type CapacityStackResponse,
  type ComponentMetric,
  type ComponentStack,
} from '@/api/capacity';

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  mimir: <Activity className="h-5 w-5" />,
  loki: <FileText className="h-5 w-5" />,
  tempo: <Layers className="h-5 w-5" />,
  pyroscope: <Database className="h-5 w-5" />,
};

function fmt(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(2);
}

function statusClasses(status: ComponentMetric['status']): {
  text: string;
  bar: string;
  dot: string;
} {
  switch (status) {
    case 'red':
      return {
        text: 'text-red-700',
        bar: 'bg-red-500',
        dot: 'bg-red-500',
      };
    case 'amber':
      return {
        text: 'text-amber-700',
        bar: 'bg-amber-500',
        dot: 'bg-amber-500',
      };
    case 'green':
      return {
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
        dot: 'bg-emerald-500',
      };
    default:
      return {
        text: 'text-slate-500',
        bar: 'bg-slate-400',
        dot: 'bg-slate-400',
      };
  }
}

export default function CapacityDashboard() {
  const [stack, setStack] = useState<CapacityStackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const payload = await getCapacityStack();
      setStack(payload);
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Failed to load capacity stack.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="page-eyebrow">
            <Gauge className="h-3 w-3" strokeWidth={3} />
            LGTM utilisation
          </div>
          <h1 className="page-title">Capacity Planning</h1>
          <p className="page-subtitle">
            Live min / max / avg / current for every component in the LGTM
            stack. Routes through the{' '}
            <Link
              to="/admin/integrations"
              className="font-semibold text-brand-700 underline decoration-brand-200 decoration-2 underline-offset-2 hover:decoration-brand-500"
            >
              Integrations
            </Link>{' '}
            resolver — flip any component to <code className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-xs text-brand-800">use_mock = false</code>{' '}
            with a real base URL to pull real values.
          </p>
          {stack && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Last refreshed {new Date(stack.collected_at).toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">Could not load capacity stack</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !stack && <StackSkeleton />}

      {stack && (
        <div className="space-y-5">
          {stack.components.map((c) => (
            <ComponentSection key={c.component} component={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentSection({ component }: { component: ComponentStack }) {
  const redCount = component.metrics.filter((m) => m.status === 'red').length;
  const amberCount = component.metrics.filter((m) => m.status === 'amber').length;
  const overallStatus =
    redCount > 0 ? 'red' : amberCount > 0 ? 'amber' : 'green';
  const overallClasses = statusClasses(overallStatus);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-brand-50 p-2 text-brand-700">
            {COMPONENT_ICONS[component.component] ?? <Gauge className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">
              {component.display_name}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              {component.base_url || '(base URL not configured)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              component.source === 'live'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {component.source}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${overallClasses.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${overallClasses.dot}`} />
            {redCount > 0
              ? `${redCount} red`
              : amberCount > 0
                ? `${amberCount} warning`
                : 'healthy'}
          </span>
        </div>
      </header>

      {component.error && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-800">
          {component.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {component.metrics.map((m) => (
          <MetricCard key={m.name} metric={m} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric }: { metric: ComponentMetric }) {
  const cls = statusClasses(metric.status);
  const util = metric.utilization_pct;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {metric.display_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{metric.unit}</p>
        </div>
        {util !== null && (
          <span className={`text-xs font-semibold ${cls.text}`}>
            {util.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {fmt(metric.current, metric.unit)}
        <span className="ml-1 text-sm font-normal text-slate-400">
          {metric.unit !== '%' && metric.unit}
        </span>
      </p>
      {util !== null && metric.limit !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${cls.bar}`}
            style={{ width: `${Math.min(100, util)}%` }}
          />
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-xs">
        <Stat label="Min" value={fmt(metric.min, metric.unit)} />
        <Stat label="Avg" value={fmt(metric.avg, metric.unit)} />
        <Stat label="Max" value={fmt(metric.max, metric.unit)} />
      </div>
      {metric.limit !== null && (
        <div className="mt-2 text-xs text-slate-400">
          Limit: {fmt(metric.limit, metric.unit)} {metric.unit !== '%' && metric.unit}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="font-mono text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function StackSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}
