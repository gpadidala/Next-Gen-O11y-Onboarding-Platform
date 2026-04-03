import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Send,
  Eye,
  X,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboarding } from '../context/OnboardingContext';
import type { GovernanceResult, Violation } from '@/types/governance';
import type {
  ArtifactPreviewResponse,
  ArtifactFile,
} from '@/types/artifact';
import type { TelemetrySignal, OnboardingSubmitResponse } from '@/types/onboarding';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const SIGNAL_LABELS: Record<TelemetrySignal, string> = {
  METRICS: 'Metrics',
  LOGS: 'Logs',
  TRACES: 'Traces',
  PROFILING: 'Profiling',
  RUM: 'Real User Monitoring',
  SYNTHETICS: 'Synthetics',
};

function getScoreStatus(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

/* -------------------------------------------------------------------------- */
/*  GovernanceAlert                                                           */
/* -------------------------------------------------------------------------- */

function GovernanceAlert({ violation }: { violation: Violation }) {
  const isHard = violation.severity === 'ERROR';
  const isWarning = violation.severity === 'WARNING';

  return (
    <div
      className={`rounded-md border p-3 ${
        isHard
          ? 'border-red-200 bg-red-50'
          : isWarning
            ? 'border-amber-200 bg-amber-50'
            : 'border-blue-200 bg-blue-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {isHard ? (
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
        ) : isWarning ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">
              {violation.ruleId}
            </span>
            <Badge
              status={isHard ? 'error' : isWarning ? 'warning' : 'info'}
              size="sm"
            >
              {violation.severity}
            </Badge>
          </div>
          <p
            className={`mt-1 text-sm font-medium ${
              isHard ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-blue-800'
            }`}
          >
            {violation.ruleName}
          </p>
          <p
            className={`mt-0.5 text-sm ${
              isHard ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700'
            }`}
          >
            {violation.message}
          </p>
          {violation.remediation && (
            <p className="mt-1 text-xs text-slate-600">
              Fix: {violation.remediation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ArtifactPreview Modal                                                     */
/* -------------------------------------------------------------------------- */

interface ArtifactPreviewProps {
  artifacts: ArtifactFile[];
  onClose: () => void;
}

function ArtifactPreview({ artifacts, onClose }: ArtifactPreviewProps) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Generated Artifacts Preview
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-50 py-2">
            {artifacts.map((artifact, idx) => (
              <button
                key={artifact.filename}
                onClick={() => setSelected(idx)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  idx === selected
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{artifact.filename}</span>
                </div>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {artifact.type}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {artifacts[selected] && (
              <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-900 p-4 text-xs text-green-300">
                <code>{artifacts[selected].content}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation Modal                                                        */
/* -------------------------------------------------------------------------- */

interface ConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

function ConfirmModal({ onConfirm, onCancel, submitting }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <Send className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Submit Onboarding Request
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Are you sure you want to submit this onboarding request? It will be
          sent for approval and artifact generation will begin.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={submitting}>
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section Card                                                              */
/* -------------------------------------------------------------------------- */

interface SectionCardProps {
  title: string;
  stepNumber: number;
  children: React.ReactNode;
  onEdit?: () => void;
}

function SectionCard({ title, stepNumber, children, onEdit }: SectionCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {stepNumber}
          </span>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Edit
          </button>
        )}
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">{children}</div>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value || <span className="text-slate-300">--</span>}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function Step9ReviewSubmit() {
  const { formData, prevStep, setStep, updateFormData, setGovernanceResult } =
    useOnboarding();

  /* ---- State ---- */
  const [govLoading, setGovLoading] = useState(true);
  const [govError, setGovError] = useState<string | null>(null);
  const [govResult, setGovResultLocal] = useState<GovernanceResult | null>(null);

  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifacts, setArtifacts] = useState<ArtifactPreviewResponse | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<OnboardingSubmitResponse | null>(null);

  const [justification, setJustification] = useState('');

  /* ---- Governance check on mount ---- */
  useEffect(() => {
    let cancelled = false;

    async function validateGovernance() {
      setGovLoading(true);
      setGovError(null);

      try {
        const response = await fetch('/api/v1/governance/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: formData }),
        });

        if (!response.ok) {
          throw new Error(`Validation failed (${response.status})`);
        }

        const result: GovernanceResult = await response.json();
        if (!cancelled) {
          setGovResultLocal(result);
          setGovernanceResult(result);
        }
      } catch (err) {
        if (!cancelled) {
          setGovError(
            err instanceof Error ? err.message : 'Governance validation failed',
          );
        }
      } finally {
        if (!cancelled) setGovLoading(false);
      }
    }

    validateGovernance();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Derived state ---- */
  const hardViolations = useMemo(
    () => govResult?.violations.filter((v) => v.severity === 'ERROR') ?? [],
    [govResult],
  );
  const softViolations = useMemo(
    () =>
      govResult?.violations.filter(
        (v) => v.severity === 'WARNING' || v.severity === 'INFO',
      ) ?? [],
    [govResult],
  );

  const hasHardViolations = hardViolations.length > 0;
  const hasSoftViolations = softViolations.length > 0;
  const needsJustification = hasSoftViolations && !hasHardViolations;

  const governanceScore = useMemo(() => {
    if (!govResult) return 0;
    const total = govResult.rulesEvaluated;
    if (total === 0) return 100;
    const violationCount = govResult.violations.length;
    return Math.max(0, Math.round(((total - violationCount) / total) * 100));
  }, [govResult]);

  const canSubmit =
    !hasHardViolations &&
    (!needsJustification || justification.trim().length > 0);

  /* ---- Handlers ---- */
  const handleGenerateArtifacts = useCallback(async () => {
    setArtifactsLoading(true);
    try {
      const response = await fetch('/api/v1/artifacts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) throw new Error(`Preview failed (${response.status})`);

      const result: ArtifactPreviewResponse = await response.json();
      setArtifacts(result);
      setShowArtifacts(true);
    } catch {
      // Handled silently; user can retry
    } finally {
      setArtifactsLoading(false);
    }
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          governanceAcknowledged: true,
          reviewConfirmed: true,
          ...(justification ? { overrideJustification: justification } : {}),
        }),
      });

      if (!response.ok) throw new Error(`Submission failed (${response.status})`);

      const result: OnboardingSubmitResponse = await response.json();
      setSubmitResult(result);
      updateFormData({ reviewConfirmed: true, governanceAcknowledged: true });
    } catch {
      // Handled silently; user can retry
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [formData, justification, updateFormData]);

  /* ---- Success state ---- */
  if (submitResult) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Onboarding Submitted Successfully
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your request has been submitted and is{' '}
            {submitResult.status === 'pending_approval'
              ? 'pending approval'
              : 'being processed'}
            .
          </p>
        </div>
        <Card className="w-full max-w-md">
          <div className="space-y-2">
            <DataRow label="Request ID" value={submitResult.requestId} />
            <DataRow
              label="Status"
              value={
                <Badge status="info">{submitResult.status.replace('_', ' ').toUpperCase()}</Badge>
              }
            />
            <DataRow label="Message" value={submitResult.message} />
          </div>
        </Card>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() => window.location.assign('/')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Header with governance score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Review & Submit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review your configuration and submit for provisioning.
          </p>
        </div>
        {govResult && (
          <div className="flex flex-col items-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${
                getScoreStatus(governanceScore) === 'success'
                  ? 'border-green-300'
                  : getScoreStatus(governanceScore) === 'warning'
                    ? 'border-amber-300'
                    : 'border-red-300'
              }`}
            >
              <span className="text-lg font-bold text-slate-900">
                {governanceScore}
              </span>
            </div>
            <span className="mt-1 text-xs text-slate-500">
              Governance Score
            </span>
          </div>
        )}
      </div>

      {/* Governance loading */}
      {govLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-slate-600">
            Running governance validation...
          </span>
        </div>
      )}

      {/* Governance error */}
      {govError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Governance Check Failed
              </h4>
              <p className="mt-1 text-sm text-red-700">{govError}</p>
            </div>
          </div>
        </div>
      )}

      {/* HARD Violations */}
      {hardViolations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-800">
              Blocking Violations ({hardViolations.length})
            </h3>
          </div>
          {hardViolations.map((v) => (
            <GovernanceAlert key={v.ruleId} violation={v} />
          ))}
        </div>
      )}

      {/* SOFT Violations */}
      {softViolations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-800">
              Warnings ({softViolations.length})
            </h3>
          </div>
          {softViolations.map((v) => (
            <GovernanceAlert key={v.ruleId} violation={v} />
          ))}
        </div>
      )}

      {/* Justification for soft violations */}
      {needsJustification && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold text-amber-800">
            Override Justification Required
          </h4>
          <p className="mt-1 text-sm text-amber-700">
            Please provide a justification to proceed with the warnings above.
          </p>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain why these warnings can be accepted..."
            className="mt-3 block w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={3}
          />
        </div>
      )}

      {/* Governance passed */}
      {govResult && !hasHardViolations && !hasSoftViolations && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="text-sm font-semibold text-green-800">
                All Governance Checks Passed
              </h4>
              <p className="mt-0.5 text-sm text-green-700">
                {govResult.rulesEvaluated} rules evaluated. No violations found.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Summary */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">
          Configuration Summary
        </h3>

        {/* Step 1: App Identity */}
        <SectionCard
          title="Application Identity"
          stepNumber={1}
          onEdit={() => setStep(1)}
        >
          <div className="space-y-1">
            <DataRow label="App Name" value={formData.appName} />
            <DataRow label="App Code" value={formData.appCode} />
            <DataRow label="Portfolio" value={formData.portfolio} />
            <DataRow label="Description" value={formData.description} />
          </div>
        </SectionCard>

        {/* Step 2: Platform */}
        <SectionCard
          title="Platform & Stack"
          stepNumber={2}
          onEdit={() => setStep(2)}
        >
          <div className="space-y-1">
            <DataRow label="Hosting Platform" value={formData.hostingPlatform} />
            <DataRow label="Tech Stack" value={formData.techStack} />
            <DataRow label="Runtime Version" value={formData.runtimeVersion} />
          </div>
        </SectionCard>

        {/* Step 3: Signals */}
        <SectionCard
          title="Telemetry Signals"
          stepNumber={3}
          onEdit={() => setStep(3)}
        >
          <div className="flex flex-wrap gap-1.5">
            {formData.telemetrySignals.length > 0 ? (
              formData.telemetrySignals.map((sig) => (
                <Badge key={sig} status="info" size="md">
                  {SIGNAL_LABELS[sig]}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">No signals selected</span>
            )}
          </div>
        </SectionCard>

        {/* Step 4: Config */}
        <SectionCard
          title="Technical Configuration"
          stepNumber={4}
          onEdit={() => setStep(4)}
        >
          <div className="space-y-1">
            <DataRow
              label="Sampling Rate"
              value={`${(formData.technicalConfig.samplingRate * 100).toFixed(0)}%`}
            />
            <DataRow
              label="Retention"
              value={`${formData.technicalConfig.retentionDays} days`}
            />
            <DataRow
              label="Auto-Instrumentation"
              value={formData.technicalConfig.autoInstrumentation ? 'Enabled' : 'Disabled'}
            />
          </div>
        </SectionCard>

        {/* Step 5: Ownership */}
        <SectionCard
          title="Alert & Ownership"
          stepNumber={5}
          onEdit={() => setStep(5)}
        >
          <div className="space-y-1">
            <DataRow label="Alert Owner Email" value={formData.alertOwnerEmail} />
            <DataRow label="Alert Owner Team" value={formData.alertOwnerTeam} />
            <DataRow label="Escalation Policy" value={formData.escalationPolicy} />
          </div>
        </SectionCard>

        {/* Step 6: Environment */}
        <SectionCard
          title="Environment Readiness"
          stepNumber={6}
          onEdit={() => setStep(6)}
        >
          <div className="flex flex-wrap gap-2">
            {(
              Object.entries(formData.environmentReadiness) as [
                string,
                { enabled: boolean },
              ][]
            ).map(([env, cfg]) => (
              <Badge
                key={env}
                status={cfg.enabled ? 'success' : 'neutral'}
                size="md"
              >
                {env}: {cfg.enabled ? 'Ready' : 'Not Ready'}
              </Badge>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <Button variant="secondary" onClick={prevStep}>
          Back
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          icon={<Eye className="h-4 w-4" />}
          loading={artifactsLoading}
          onClick={handleGenerateArtifacts}
        >
          Generate Artifacts
        </Button>

        <Button
          icon={<Send className="h-4 w-4" />}
          disabled={govLoading || !canSubmit}
          onClick={() => setShowConfirm(true)}
        >
          Submit
        </Button>
      </div>

      {/* Disabled submit explanation */}
      {hasHardViolations && (
        <p className="text-xs text-red-600">
          Submission is blocked due to governance violations. Fix the issues
          above or contact the platform team for help.
        </p>
      )}

      {/* Artifact preview modal */}
      {showArtifacts && artifacts && (
        <ArtifactPreview
          artifacts={artifacts.artifacts}
          onClose={() => setShowArtifacts(false)}
        />
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
