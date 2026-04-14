/* -------------------------------------------------------------------------- */
/*  Integrations admin — configure read-path for every upstream system       */
/* -------------------------------------------------------------------------- */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bug,
  CheckCircle2,
  Database,
  PlugZap,
  Play,
  Save,
  TestTube2,
  Server,
  Activity,
  Ticket,
  Users,
  FileText,
  Gauge,
  Globe,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  listIntegrations,
  runIntegration,
  updateIntegration,
  testIntegration,
} from '@/api/integrations';
import type {
  IntegrationConfig,
  IntegrationConfigUpdate,
  IntegrationRunResult,
  IntegrationTarget,
  IntegrationTestResult,
} from '@/types/integration';

const TARGET_ICONS: Record<IntegrationTarget, React.ReactNode> = {
  cmdb: <Database className="h-5 w-5" />,
  mimir: <Activity className="h-5 w-5" />,
  loki: <FileText className="h-5 w-5" />,
  tempo: <Layers className="h-5 w-5" />,
  pyroscope: <Gauge className="h-5 w-5" />,
  faro: <Eye className="h-5 w-5" />,
  grafana: <Users className="h-5 w-5" />,
  blackbox: <Globe className="h-5 w-5" />,
  jira: <Bug className="h-5 w-5" />,
  confluence: <BookOpen className="h-5 w-5" />,
  servicenow: <Ticket className="h-5 w-5" />,
};

interface IntegrationGroup {
  title: string;
  subtitle: string;
  targets: IntegrationTarget[];
}

const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    title: 'Source of truth',
    subtitle: 'The CMDB catalog every other integration reconciles against.',
    targets: ['cmdb'],
  },
  {
    title: 'Observability read path',
    subtitle:
      'LGTM components + Grafana RBAC. Run probes to pull current ingestion per app.',
    targets: [
      'mimir',
      'loki',
      'tempo',
      'pyroscope',
      'faro',
      'blackbox',
      'grafana',
    ],
  },
  {
    title: 'Work items & ITSM',
    subtitle:
      'Downstream targets for onboarding artifacts — Jira stories, Confluence runbooks, ServiceNow change records.',
    targets: ['jira', 'confluence', 'servicenow'],
  },
];

export default function IntegrationsPage() {
  const [rows, setRows] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await listIntegrations());
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Failed to load integrations.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="page-eyebrow">
          <PlugZap className="h-3 w-3" strokeWidth={3} />
          Read-path control plane
        </div>
        <h1 className="page-title">Integrations</h1>
        <p className="page-subtitle">
          Configure the base URL, bearer token, and mock/live mode for every
          upstream system — CMDB, Mimir, Loki, Tempo, Pyroscope, Faro, Grafana,
          Blackbox. Changes persist to local Postgres and take effect on the
          next probe cycle. Click <strong>Run&nbsp;probe</strong> to pull data
          now.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>{error}</div>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {INTEGRATION_GROUPS.map((group) => {
            const groupRows = rows.filter((r) =>
              group.targets.includes(r.target),
            );
            if (groupRows.length === 0) return null;
            return (
              <section key={group.title}>
                <div className="mb-3 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-brand-800">
                      {group.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {group.subtitle}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {groupRows.length}{' '}
                    {groupRows.length === 1 ? 'target' : 'targets'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {groupRows.map((row) => (
                    <IntegrationCard
                      key={row.target}
                      row={row}
                      onUpdated={(updated) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.target === updated.target ? updated : r,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Single-card component ───────────────────────────────────────────── */

function IntegrationCard({
  row,
  onUpdated,
}: {
  row: IntegrationConfig;
  onUpdated: (updated: IntegrationConfig) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<IntegrationConfigUpdate>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<IntegrationRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const startEdit = () => {
    setIsEditing(true);
    setForm({
      base_url: row.base_url,
      use_mock: row.use_mock,
      is_enabled: row.is_enabled,
      auth_mode: row.auth_mode,
    });
    setFormError(null);
  };

  const cancel = () => {
    setIsEditing(false);
    setForm({});
    setFormError(null);
  };

  const save = async () => {
    try {
      setSaving(true);
      setFormError(null);
      const updated = await updateIntegration(row.target, form);
      onUpdated(updated);
      setIsEditing(false);
      setForm({});
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Save failed.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    try {
      setTesting(true);
      const result = await testIntegration(row.target);
      setTestResult(result);
      // Re-fetch to pick up the stored last_test_* fields.
      const refreshed = await (await import('@/api/integrations')).getIntegration(
        row.target,
      );
      onUpdated(refreshed);
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Test failed.';
      setTestResult({
        target: row.target,
        ok: false,
        status: 'error',
        message: msg,
        tested_at: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const runProbe = async () => {
    try {
      setRunning(true);
      setRunError(null);
      const result = await runIntegration(row.target);
      setRunResult(result);
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Run failed.';
      setRunError(msg);
      setRunResult(null);
    } finally {
      setRunning(false);
    }
  };

  const lastTestBadge = useMemo(() => {
    const status = testResult?.status ?? row.last_test_status;
    if (!status) return null;
    const tone =
      status === 'ok'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'mock'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-red-100 text-red-800';
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${tone}`}
      >
        {status === 'ok' || status === 'mock' ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {status}
      </span>
    );
  }, [testResult, row.last_test_status]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-100 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-brand-50 p-2 text-brand-700">
            {TARGET_ICONS[row.target] ?? <Server className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">{row.display_name}</h3>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              {row.target}
            </p>
            {row.description && (
              <p className="mt-1 text-xs text-slate-500">{row.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.use_mock && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              mock
            </span>
          )}
          {!row.is_enabled && (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              disabled
            </span>
          )}
          {lastTestBadge}
        </div>
      </div>

      <div className="p-4 text-sm">
        {!isEditing ? (
          <>
            <Row label="Base URL" value={<code className="font-mono text-xs">{row.base_url || '—'}</code>} />
            <Row
              label="Auth"
              value={
                row.has_token ? (
                  <span className="text-emerald-700">
                    {row.auth_mode} · <span className="font-mono">••••••••</span>
                  </span>
                ) : (
                  <span className="text-slate-400">none</span>
                )
              }
            />
            <Row
              label="Mode"
              value={
                row.use_mock
                  ? 'Mock (deterministic in-process data)'
                  : 'Live (real HTTP calls)'
              }
            />
            {row.last_test_at && (
              <Row
                label="Last test"
                value={
                  <span className="text-xs text-slate-500">
                    {new Date(row.last_test_at).toLocaleString()} ·{' '}
                    {row.last_test_message ?? '—'}
                  </span>
                }
              />
            )}
            {testResult && testResult.target === row.target && (
              <div
                className={`mt-3 rounded-md border p-3 text-xs ${
                  testResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                <div className="font-medium">
                  {testResult.ok ? 'Reachable' : 'Unreachable'}
                </div>
                <div className="mt-0.5 break-all">{testResult.message}</div>
              </div>
            )}
            {runError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <div className="font-medium">Run failed</div>
                <div className="mt-0.5 break-all">{runError}</div>
              </div>
            )}
            {runResult && runResult.target === row.target && (
              <RunResultPanel result={runResult} />
            )}
          </>
        ) : (
          <div className="space-y-3">
            <LabeledInput
              label="Base URL"
              value={form.base_url ?? ''}
              onChange={(v) => setForm({ ...form, base_url: v })}
              placeholder="https://mimir.internal"
              mono
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Auth token (Bearer)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.auth_token ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, auth_token: e.target.value })
                  }
                  placeholder={
                    row.has_token
                      ? '•••••••• (leave blank to keep existing)'
                      : 'Paste token to set'
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to keep the existing token. Type a single space and
                save to clear.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.use_mock ?? row.use_mock}
                  onChange={(e) =>
                    setForm({ ...form, use_mock: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                Mock mode
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_enabled ?? row.is_enabled}
                  onChange={(e) =>
                    setForm({ ...form, is_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                Enabled
              </label>
            </div>
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {formError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <TestTube2 className="h-3.5 w-3.5" />
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            <button
              type="button"
              onClick={runProbe}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" />
              {running ? 'Running…' : 'Run probe'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Categorized run-result panel ────────────────────────────────────── */

function RunResultPanel({ result }: { result: IntegrationRunResult }) {
  const tone =
    result.status === 'failed'
      ? 'border-red-200 bg-red-50'
      : 'border-emerald-200 bg-emerald-50';
  const headerTone =
    result.status === 'failed' ? 'text-red-900' : 'text-emerald-900';
  const badgeTone =
    result.status === 'mock'
      ? 'bg-amber-100 text-amber-800'
      : result.status === 'failed'
        ? 'bg-red-100 text-red-800'
        : 'bg-emerald-100 text-emerald-800';
  const durationMs =
    new Date(result.finished_at).getTime() -
    new Date(result.started_at).getTime();
  return (
    <div className={`mt-3 rounded-md border p-3 ${tone}`}>
      <div
        className={`flex items-center justify-between text-xs font-medium ${headerTone}`}
      >
        <span>
          {result.items_onboarded}/{result.items_processed} items ·{' '}
          {durationMs}ms
        </span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeTone}`}>
          {result.status}
        </span>
      </div>
      <p className={`mt-0.5 text-xs ${headerTone}`}>{result.message}</p>
      {result.categories.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            By {result.category_label}
          </div>
          <div className="space-y-1.5">
            {result.categories.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{c.label}</span>
                  <span className="text-slate-500">
                    {c.onboarded}/{c.total} · {c.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      c.pct >= 80
                        ? 'bg-emerald-500'
                        : c.pct >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, c.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-right text-sm text-slate-700">{value}</span>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm ${
          mono ? 'font-mono text-xs' : ''
        }`}
      />
    </div>
  );
}
