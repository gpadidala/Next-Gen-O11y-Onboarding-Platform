import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2, Edit2 } from 'lucide-react';
import { getOnboarding, type BackendOnboardingResponse } from '@/api/onboarding';

/* ── Status metadata ─────────────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  draft:               { label: 'Draft',              color: 'text-gray-600',   bg: 'bg-gray-100',   icon: <Edit2 className="h-4 w-4" /> },
  in_progress:         { label: 'In Progress',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  capacity_check:      { label: 'Capacity Check',     color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  similarity_search:   { label: 'Similarity Search',  color: 'text-purple-700', bg: 'bg-purple-100', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  governance_review:   { label: 'Governance Review',  color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <Clock className="h-4 w-4" /> },
  artifacts_generated: { label: 'Artifacts Ready',    color: 'text-indigo-700', bg: 'bg-indigo-100', icon: <CheckCircle className="h-4 w-4" /> },
  submitted:           { label: 'Submitted',          color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Clock className="h-4 w-4" /> },
  approved:            { label: 'Approved',           color: 'text-green-700',  bg: 'bg-green-100',  icon: <CheckCircle className="h-4 w-4" /> },
  provisioning:        { label: 'Provisioning',       color: 'text-indigo-700', bg: 'bg-indigo-100', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  completed:           { label: 'Completed',          color: 'text-green-700',  bg: 'bg-green-100',  icon: <CheckCircle className="h-4 w-4" /> },
  rejected:            { label: 'Rejected',           color: 'text-red-700',    bg: 'bg-red-100',    icon: <AlertCircle className="h-4 w-4" /> },
  cancelled:           { label: 'Cancelled',          color: 'text-red-700',    bg: 'bg-red-100',    icon: <AlertCircle className="h-4 w-4" /> },
};

/* ── Timeline steps derived from status ─────────────────────────────────── */

const PIPELINE_STEPS = [
  { key: 'draft',               label: 'Draft Created' },
  { key: 'in_progress',         label: 'In Progress' },
  { key: 'capacity_check',      label: 'Capacity Check' },
  { key: 'similarity_search',   label: 'Similarity Search' },
  { key: 'governance_review',   label: 'Governance Review' },
  { key: 'artifacts_generated', label: 'Artifacts Generated' },
  { key: 'submitted',           label: 'Submitted' },
  { key: 'approved',            label: 'Approved' },
  { key: 'provisioning',        label: 'Provisioning' },
  { key: 'completed',           label: 'Completed' },
];

const STATUS_ORDER = PIPELINE_STEPS.map(s => s.key);

function getStepState(stepKey: string, currentStatus: string): 'complete' | 'active' | 'pending' {
  if (currentStatus === 'rejected' || currentStatus === 'cancelled') {
    const currentIdx = STATUS_ORDER.indexOf('submitted');
    const stepIdx    = STATUS_ORDER.indexOf(stepKey);
    if (stepIdx < currentIdx) return 'complete';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  }
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stepIdx    = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx)  return 'complete';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

/* ── Field row helper ────────────────────────────────────────────────────── */

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="text-sm text-slate-500 shrink-0">{label}</dt>
      <dd className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''}`}
        style={{ color: 'rgb(var(--text-primary))' }}>
        {value || '—'}
      </dd>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<BackendOnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getOnboarding(id);
        setRecord(data);
      } catch {
        setError('Unable to load this onboarding request.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-red-700">{error ?? 'Record not found'}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[record.status] ?? STATUS_META['draft'];

  return (
    <div className="space-y-6 p-6">

      {/* ── BREADCRUMB ──────────────────────────────────────────────────── */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline" style={{ color: 'rgb(var(--text-muted))' }}>
          O11y Platform
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
        <Link to="/" className="hover:underline" style={{ color: 'rgb(var(--text-muted))' }}>
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
        <span className="font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
          {record.app_code}
        </span>
      </nav>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg p-1.5 transition-colors hover:bg-slate-100"
            style={{ color: 'rgb(var(--text-muted))' }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
              {record.app_name}
            </h1>
            <p className="mt-0.5 text-sm font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              {record.app_code}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
          {statusMeta.icon}
          {statusMeta.label}
        </span>
      </div>

      {/* ── PIPELINE PROGRESS ───────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
      >
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>
          Onboarding Pipeline
        </h2>

        {/* Show rejected / cancelled banner if applicable */}
        {(record.status === 'rejected' || record.status === 'cancelled') && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            This request was {record.status}
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="flex min-w-max items-start gap-0">
            {PIPELINE_STEPS.map((step, idx) => {
              const state = getStepState(step.key, record.status);
              return (
                <div key={step.key} className="flex items-start">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border-2 transition-colors ${
                        state === 'complete'
                          ? 'border-green-500 bg-green-500 text-white'
                          : state === 'active'
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      {state === 'complete' ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-center text-[10px] font-medium leading-tight max-w-[72px] ${
                        state === 'active' ? 'text-blue-600' : state === 'complete' ? 'text-green-700' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {/* Connector */}
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`mt-4 h-0.5 w-8 shrink-0 ${state === 'complete' ? 'bg-green-400' : 'bg-slate-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DETAILS GRID ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* Service Identity */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Service Identity
          </h3>
          <dl>
            <Field label="App Name"   value={record.app_name} />
            <Field label="App Code"   value={record.app_code} mono />
            <Field label="Portfolio"  value={record.portfolio} />
            <Field label="Created By" value={record.created_by} />
          </dl>
        </div>

        {/* Platform */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Platform & Stack
          </h3>
          <dl>
            <Field label="Hosting Platform" value={record.hosting_platform} />
            <Field label="Tech Stack"        value={record.tech_stack} />
          </dl>
        </div>

        {/* Ownership */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Ownership
          </h3>
          <dl>
            <Field label="Alert Owner Email" value={record.alert_owner_email} />
            <Field label="Alert Owner Team"  value={record.alert_owner_team} />
          </dl>
        </div>

        {/* Timestamps */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Timeline
          </h3>
          <dl>
            <Field label="Created"   value={new Date(record.created_at).toLocaleString()} />
            <Field label="Updated"   value={new Date(record.updated_at).toLocaleString()} />
            <Field label="Submitted" value={record.submitted_at ? new Date(record.submitted_at).toLocaleString() : 'Not yet submitted'} />
          </dl>
        </div>

        {/* Notes */}
        {record.notes && (
          <div
            className="rounded-xl border p-5 sm:col-span-2"
            style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
          >
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
              Notes
            </h3>
            <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>{record.notes}</p>
          </div>
        )}
      </div>

      {/* ── TELEMETRY SIGNALS ───────────────────────────────────────────── */}
      {record.telemetry_scope && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Telemetry Scope
          </h3>
          <pre className="text-xs overflow-auto rounded-lg p-3" style={{ background: 'rgb(var(--surface-secondary))', color: 'rgb(var(--text-secondary))' }}>
            {JSON.stringify(record.telemetry_scope, null, 2)}
          </pre>
        </div>
      )}

      {/* ── ARTIFACTS ───────────────────────────────────────────────────── */}
      {record.artifacts && record.artifacts.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgb(var(--border-color))', background: 'rgb(var(--surface-primary))' }}
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
            Generated Artifacts
          </h3>
          <div className="space-y-2">
            {record.artifacts.map((a: Record<string, string>, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm"
                style={{ background: 'rgb(var(--surface-secondary))' }}
              >
                <span className="font-mono font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                  {a.artifact_type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.status === 'completed' ? 'bg-green-100 text-green-700' :
                  a.status === 'failed'    ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIONS ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
          style={{ borderColor: 'rgb(var(--border-color))', color: 'rgb(var(--text-secondary))' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <Link
          to="/onboarding/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: 'rgb(var(--brand-600))' }}
        >
          New Onboarding
        </Link>
      </div>
    </div>
  );
}
