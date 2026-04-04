import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createOnboarding,
  updateOnboarding,
  submitOnboarding,
} from '@/api/onboarding';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface WizardForm {
  // Step 1
  app_name: string;
  app_code: string;
  portfolio: string;
  alert_owner_email: string;
  alert_owner_team: string;
  created_by: string;
  notes: string;
  // Step 2
  hosting_platform: string;
  tech_stack: string;
  // Step 3
  signals: string[];
  environments: string[];
  // Step 4
  exporters: string[];
  sampling_rate: number;
  log_format: string;
}

interface WizardState {
  form: WizardForm;
  currentStep: number;
  onboardingId: string | null;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { number: 1, label: 'Service Identity' },
  { number: 2, label: 'Platform & Stack' },
  { number: 3, label: 'O11y Signals' },
  { number: 4, label: 'Exporter Config' },
  { number: 5, label: 'Review & Submit' },
];

const PORTFOLIO_OPTIONS = [
  'Financial Services',
  'Identity & Access',
  'E-Commerce',
  'Data & AI Platform',
  'Platform Engineering',
  'DevOps & Infrastructure',
  'Customer Experience',
  'Partner Integrations',
];

const HOSTING_PLATFORMS = [
  { key: 'azure_aks', icon: '☁️', name: 'AKS', subtitle: 'Azure Kubernetes Service' },
  { key: 'gke', icon: '🌿', name: 'GKE', subtitle: 'Google Kubernetes Engine' },
  { key: 'eks', icon: '📦', name: 'EKS', subtitle: 'Amazon Kubernetes Service' },
  { key: 'lambda', icon: '⚡', name: 'Lambda', subtitle: 'Serverless Functions' },
  { key: 'on_prem', icon: '🖥️', name: 'VM / On-Prem', subtitle: 'Virtual Machine or On-Premise' },
];

const TECH_STACKS = [
  { key: 'java_spring', icon: '☕', name: 'Java Spring Boot' },
  { key: 'dotnet', icon: '🔷', name: '.NET / C#' },
  { key: 'nodejs_express', icon: '🟩', name: 'Node.js' },
  { key: 'python_fastapi', icon: '🐍', name: 'Python' },
  { key: 'go', icon: '🚀', name: 'Go' },
  { key: 'rust', icon: '🦀', name: 'Rust' },
];

const SIGNAL_OPTIONS = [
  { key: 'metrics', icon: '📊', name: 'Metrics', description: 'Resource usage, custom metrics via OTEL/Prometheus', recommended: true },
  { key: 'logs', icon: '📋', name: 'Logs', description: 'Structured application and system logs via Loki' },
  { key: 'traces', icon: '🔍', name: 'Traces', description: 'Distributed request tracing via Tempo + OTLP' },
  { key: 'profiles', icon: '🔥', name: 'Profiles', description: 'Continuous CPU/memory profiling via Pyroscope' },
  { key: 'rum', icon: '🌐', name: 'RUM / Faro', description: 'Browser Real User Monitoring via Grafana Faro' },
];

const ENVIRONMENT_OPTIONS = [
  { key: 'DEV', label: 'DEV', description: 'Development environment' },
  { key: 'QA', label: 'QA', description: 'QA/Testing environment' },
  { key: 'QA2', label: 'QA2', description: 'Second QA environment (optional)' },
  { key: 'PROD', label: 'PROD', description: 'Production (required)', required: true },
];

/* -------------------------------------------------------------------------- */
/*  Exporter derivation logic                                                  */
/* -------------------------------------------------------------------------- */

function deriveExporters(platform: string, stack: string, signals: string[]): string[] {
  const exporters: string[] = [];

  if (platform === 'azure_aks' || platform === 'gke') {
    exporters.push('otel-collector (DaemonSet)');
  }

  if (stack === 'java_spring') {
    exporters.push('jmx-exporter', 'spring-boot-actuator');
  } else if (stack === 'dotnet') {
    exporters.push('dotnet-runtime-exporter');
  } else if (stack === 'nodejs_express') {
    exporters.push('prom-client');
  } else if (stack === 'python_fastapi') {
    exporters.push('prometheus-fastapi-instrumentator');
  } else if (stack === 'go') {
    exporters.push('prometheus/client_golang');
  }

  if (signals.includes('logs')) {
    if (platform === 'azure_aks' || platform === 'gke' || platform === 'eks') {
      exporters.push('loki-logger');
    } else {
      exporters.push('promtail');
    }
  }

  if (signals.includes('traces')) {
    exporters.push('otel-sdk (OTLP)');
  }

  if (signals.includes('profiles')) {
    exporters.push('pyroscope-agent');
  }

  if (signals.includes('rum')) {
    exporters.push('grafana-faro-web-sdk');
  }

  if (platform === 'on_prem') {
    exporters.push('node-exporter');
  }

  if (platform === 'gke') {
    exporters.push('stackdriver-exporter');
  }

  if (platform === 'lambda') {
    exporters.push('stackdriver-exporter');
  }

  return Array.from(new Set(exporters));
}

function deriveDashboards(stack: string): string[] {
  const base = ['Cluster Overview — Resource utilisation across pods and nodes'];

  if (stack === 'java_spring') {
    return [
      ...base,
      'JVM Metrics — Heap, GC, thread pools',
      'Spring Boot Actuator — HTTP metrics, endpoints',
      'Distributed Traces — End-to-end span explorer',
    ];
  } else if (stack === 'dotnet') {
    return [
      ...base,
      '.NET Runtime — GC pressure, thread pool, CLR',
      'ASP.NET Core — Request rates, latency, errors',
      'Distributed Traces — End-to-end span explorer',
    ];
  } else if (stack === 'nodejs_express') {
    return [
      ...base,
      'Node.js Runtime — Event loop lag, memory, GC',
      'Express HTTP — Requests, status codes, latency',
    ];
  } else if (stack === 'python_fastapi') {
    return [
      ...base,
      'Python Runtime — Process metrics, GC stats',
      'FastAPI — Endpoint latency, error rates, throughput',
    ];
  } else if (stack === 'go') {
    return [
      ...base,
      'Go Runtime — Goroutines, GC, heap allocation',
      'HTTP Server — Request/response metrics',
    ];
  } else if (stack === 'rust') {
    return [
      ...base,
      'Rust Process — Memory, CPU, system calls',
      'HTTP Server — Request/response metrics',
    ];
  }
  return [...base, 'Application Metrics — Custom metric explorer'];
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validateStep1(form: WizardForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.app_name.trim()) errors.app_name = 'App name is required.';
  if (!form.app_code.trim()) errors.app_code = 'App code is required.';
  if (!form.portfolio) errors.portfolio = 'Portfolio is required.';
  if (!form.alert_owner_email.trim()) {
    errors.alert_owner_email = 'Alert owner email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.alert_owner_email)) {
    errors.alert_owner_email = 'Enter a valid email address.';
  }
  if (!form.alert_owner_team.trim()) errors.alert_owner_team = 'Alert owner team is required.';
  if (!form.created_by.trim()) {
    errors.created_by = 'Your email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.created_by)) {
    errors.created_by = 'Enter a valid email address.';
  }
  return errors;
}

function validateStep2(form: WizardForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.hosting_platform) errors.hosting_platform = 'Select a hosting platform.';
  if (!form.tech_stack) errors.tech_stack = 'Select a tech stack.';
  return errors;
}

function validateStep3(form: WizardForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.signals.length === 0) errors.signals = 'Select at least one signal.';
  return errors;
}

/* -------------------------------------------------------------------------- */
/*  Step indicator                                                             */
/* -------------------------------------------------------------------------- */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const isComplete = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <div key={step.number} className="flex flex-1 items-center">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isComplete
                      ? 'bg-blue-600 text-white'
                      : isActive
                      ? 'border-2 border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-2 border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-1 hidden whitespace-nowrap text-xs font-medium sm:block ${
                    isActive ? 'text-blue-600' : isComplete ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-1 mt-0 h-0.5 flex-1 sm:-mt-5 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 1 — Service Identity                                                  */
/* -------------------------------------------------------------------------- */

function Step1({
  form,
  onChange,
  errors,
}: {
  form: WizardForm;
  onChange: (field: keyof WizardForm, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Service Identity</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about your application so we can configure observability correctly.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* App Name */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="app_name">
            App Name <span className="text-red-500">*</span>
          </label>
          <input
            id="app_name"
            type="text"
            value={form.app_name}
            onChange={(e) => onChange('app_name', e.target.value)}
            placeholder="e.g. payment-gateway-api"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              errors.app_name
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          {errors.app_name && (
            <p className="mt-1 text-xs text-red-500">{errors.app_name}</p>
          )}
        </div>

        {/* App Code */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="app_code">
            App Code <span className="text-red-500">*</span>
          </label>
          <input
            id="app_code"
            type="text"
            value={form.app_code}
            onChange={(e) => onChange('app_code', e.target.value)}
            placeholder="e.g. APP-2001"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              errors.app_code
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          {errors.app_code ? (
            <p className="mt-1 text-xs text-red-500">{errors.app_code}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Unique 3-part code: APP-XXXX</p>
          )}
        </div>

        {/* Portfolio */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="portfolio">
            Portfolio <span className="text-red-500">*</span>
          </label>
          <select
            id="portfolio"
            value={form.portfolio}
            onChange={(e) => onChange('portfolio', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
              errors.portfolio
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          >
            <option value="">Select portfolio...</option>
            {PORTFOLIO_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.portfolio && (
            <p className="mt-1 text-xs text-red-500">{errors.portfolio}</p>
          )}
        </div>

        {/* Alert Owner Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="alert_owner_email">
            Alert Owner Email <span className="text-red-500">*</span>
          </label>
          <input
            id="alert_owner_email"
            type="email"
            value={form.alert_owner_email}
            onChange={(e) => onChange('alert_owner_email', e.target.value)}
            placeholder="team@company.com"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              errors.alert_owner_email
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          {errors.alert_owner_email && (
            <p className="mt-1 text-xs text-red-500">{errors.alert_owner_email}</p>
          )}
        </div>

        {/* Alert Owner Team */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="alert_owner_team">
            Alert Owner Team <span className="text-red-500">*</span>
          </label>
          <input
            id="alert_owner_team"
            type="text"
            value={form.alert_owner_team}
            onChange={(e) => onChange('alert_owner_team', e.target.value)}
            placeholder="e.g. Payments Backend Team"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              errors.alert_owner_team
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          {errors.alert_owner_team && (
            <p className="mt-1 text-xs text-red-500">{errors.alert_owner_team}</p>
          )}
        </div>

        {/* Created By */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="created_by">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            id="created_by"
            type="email"
            value={form.created_by}
            onChange={(e) => onChange('created_by', e.target.value)}
            placeholder="you@company.com"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              errors.created_by
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          {errors.created_by && (
            <p className="mt-1 text-xs text-red-500">{errors.created_by}</p>
          )}
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="notes">
            Notes{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="Any additional context for the platform team..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 2 — Platform & Technology                                             */
/* -------------------------------------------------------------------------- */

function Step2({
  form,
  onChange,
  errors,
}: {
  form: WizardForm;
  onChange: (field: keyof WizardForm, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Platform & Technology</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select your hosting platform and primary tech stack. This determines which exporters we'll configure.
        </p>
      </div>

      {/* Hosting Platform */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">
          Hosting Platform <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HOSTING_PLATFORMS.map((p) => {
            const selected = form.hosting_platform === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onChange('hosting_platform', p.key)}
                className={`flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <span className="mb-2 text-3xl" role="img" aria-hidden="true">{p.icon}</span>
                <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                  {p.name}
                </span>
                <span className="mt-0.5 text-xs text-gray-400">{p.subtitle}</span>
              </button>
            );
          })}
        </div>
        {errors.hosting_platform && (
          <p className="mt-2 text-xs text-red-500">{errors.hosting_platform}</p>
        )}
      </div>

      {/* Tech Stack */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">
          Tech Stack <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TECH_STACKS.map((s) => {
            const selected = form.tech_stack === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange('tech_stack', s.key)}
                className={`flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <span className="mb-2 text-3xl" role="img" aria-hidden="true">{s.icon}</span>
                <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
        {errors.tech_stack && (
          <p className="mt-2 text-xs text-red-500">{errors.tech_stack}</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — O11y Signals                                                      */
/* -------------------------------------------------------------------------- */

function Step3({
  form,
  onToggleSignal,
  onToggleEnvironment,
  errors,
}: {
  form: WizardForm;
  onToggleSignal: (key: string) => void;
  onToggleEnvironment: (key: string) => void;
  errors: Record<string, string>;
}) {
  const isK8s = form.hosting_platform === 'azure_aks' || form.hosting_platform === 'gke';

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-gray-900">O11y Signals</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose which telemetry signals to enable for your service.
        </p>
      </div>

      {/* Tip callout */}
      {isK8s && (
        <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <span className="shrink-0 text-lg" role="img" aria-label="tip">💡</span>
          <p className="text-sm text-green-800">
            <span className="font-semibold">Tip:</span> Based on your platform (
            {form.hosting_platform === 'azure_aks' ? 'AKS' : 'GKE'}), we recommend
            enabling{' '}
            <span className="font-semibold">Metrics + Logs + Traces</span> as a minimum.
          </p>
        </div>
      )}

      {/* Signals multi-select */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">
          Signals <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNAL_OPTIONS.map((sig) => {
            const selected = form.signals.includes(sig.key);
            return (
              <button
                key={sig.key}
                type="button"
                onClick={() => onToggleSignal(sig.key)}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <span className="mt-0.5 shrink-0 text-2xl" role="img" aria-hidden="true">
                  {sig.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {sig.name}
                    </span>
                    {sig.recommended && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{sig.description}</p>
                </div>
                <div
                  className={`ml-auto mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                    selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  } flex items-center justify-center`}
                >
                  {selected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {errors.signals && (
          <p className="mt-2 text-xs text-red-500">{errors.signals}</p>
        )}
      </div>

      {/* Environments */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Environments</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENVIRONMENT_OPTIONS.map((env) => {
            const checked = env.required || form.environments.includes(env.key);
            return (
              <label
                key={env.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                  env.required ? 'cursor-not-allowed opacity-80' : 'hover:shadow-md'
                } ${
                  checked
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={env.required}
                  onChange={() => !env.required && onToggleEnvironment(env.key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className={`text-sm font-semibold ${checked ? 'text-blue-700' : 'text-gray-800'}`}>
                    {env.label}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500">{env.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 4 — Exporter Configuration (read-only preview)                       */
/* -------------------------------------------------------------------------- */

function Step4({
  form,
  onSamplingChange,
  onLogFormatChange,
}: {
  form: WizardForm;
  onSamplingChange: (v: number) => void;
  onLogFormatChange: (v: string) => void;
}) {
  const exporters = deriveExporters(form.hosting_platform, form.tech_stack, form.signals);
  const dashboards = deriveDashboards(form.tech_stack);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Exporter Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Based on your selections, here is what we will automatically deploy for you.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-teal-800">
          These exporters and dashboards will be automatically configured after approval.
          Your platform team will deploy them within{' '}
          <span className="font-semibold">2 business days</span>.
        </p>
      </div>

      {/* Recommended exporters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-900">
          Recommended Exporters
          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {exporters.length} selected
          </span>
        </h3>
        {exporters.length === 0 ? (
          <p className="text-sm text-gray-500">
            Complete platform and tech stack selection to see exporters.
          </p>
        ) : (
          <ul className="space-y-2">
            {exporters.map((exp) => (
              <li key={exp} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-mono text-sm text-gray-700">{exp}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Config controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Sampling rate */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700" htmlFor="sampling_rate">
              Trace Sampling Rate
            </label>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-bold text-blue-700">
              {(form.sampling_rate * 100).toFixed(1)}%
            </span>
          </div>
          <input
            id="sampling_rate"
            type="range"
            min={0.001}
            max={1}
            step={0.001}
            value={form.sampling_rate}
            onChange={(e) => onSamplingChange(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>0.1% (low traffic)</span>
            <span>100% (all traces)</span>
          </div>
        </div>

        {/* Log format */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">Log Format</p>
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => onLogFormatChange('json')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                form.log_format === 'json'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => onLogFormatChange('text')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                form.log_format === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Plain Text
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {form.log_format === 'json'
              ? 'Structured JSON logs — best for LogQL querying in Loki.'
              : 'Plain text logs — parsed via Promtail pipeline stages.'}
          </p>
        </div>
      </div>

      {/* Dashboards */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-900">
          Grafana Dashboards to be Provisioned
        </h3>
        <ul className="space-y-2">
          {dashboards.map((dash) => (
            <li key={dash} className="flex items-center gap-2.5 rounded-lg bg-orange-50 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm text-gray-700">{dash}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 5 — Review & Submit                                                   */
/* -------------------------------------------------------------------------- */

function Step5({
  form,
  onSubmit,
  submitting,
  error,
  submitted,
  onNavigateDone,
}: {
  form: WizardForm;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
  onNavigateDone: () => void;
}) {
  const exporters = deriveExporters(form.hosting_platform, form.tech_stack, form.signals);

  const platformLabel =
    HOSTING_PLATFORMS.find((p) => p.key === form.hosting_platform)?.name ?? form.hosting_platform;
  const stackLabel =
    TECH_STACKS.find((s) => s.key === form.tech_stack)?.name ?? form.tech_stack;

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Submitted Successfully!</h2>
        <p className="mt-3 max-w-md text-sm text-gray-500">
          Your observability onboarding request has been submitted for approval. The platform
          engineering team will review it and provision your stack within{' '}
          <span className="font-semibold text-gray-700">2 business days</span>.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          You will receive an email confirmation at{' '}
          <span className="font-semibold text-gray-700">{form.created_by}</span> with next steps.
        </p>
        <button
          type="button"
          onClick={onNavigateDone}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          View Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your configuration and submit for approval.
        </p>
      </div>

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">Submission failed</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Summary grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Service section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Service</h3>
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">App Name</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{form.app_name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">App Code</dt>
              <dd className="font-mono text-sm font-semibold text-gray-900">{form.app_code || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Portfolio</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{form.portfolio || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Alert Owner</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{form.alert_owner_email || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Team</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{form.alert_owner_team || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Submitted By</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{form.created_by || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Platform section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Platform</h3>
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Hosting</dt>
              <dd className="text-sm font-semibold text-gray-900">{platformLabel || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Tech Stack</dt>
              <dd className="text-sm font-semibold text-gray-900">{stackLabel || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Log Format</dt>
              <dd className="text-sm font-semibold text-gray-900 uppercase">{form.log_format}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sm text-gray-500">Sampling Rate</dt>
              <dd className="text-sm font-semibold text-gray-900">{(form.sampling_rate * 100).toFixed(1)}%</dd>
            </div>
          </dl>
        </div>

        {/* Signals section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Signals & Environments</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {form.signals.length > 0 ? (
              form.signals.map((sig) => {
                const meta = SIGNAL_OPTIONS.find((s) => s.key === sig);
                return (
                  <span
                    key={sig}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {meta?.icon} {meta?.name ?? sig}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400">No signals selected</span>
            )}
          </div>
          <p className="mb-1.5 text-xs font-medium text-gray-500">Environments:</p>
          <div className="flex flex-wrap gap-1.5">
            {['PROD', ...form.environments].filter((v, i, a) => a.indexOf(v) === i).map((env) => (
              <span key={env} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {env}
              </span>
            ))}
          </div>
        </div>

        {/* Exporters section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Exporters ({exporters.length})
          </h3>
          {exporters.length === 0 ? (
            <p className="text-sm text-gray-400">None configured</p>
          ) : (
            <ul className="space-y-1">
              {exporters.map((exp) => (
                <li key={exp} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                  <span className="font-mono text-xs">{exp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Notes */}
      {form.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700">{form.notes}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            'Submit for Approval →'
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navigation buttons                                                         */
/* -------------------------------------------------------------------------- */

function NavButtons({
  currentStep,
  onBack,
  onNext,
  loading,
  isLastStep,
}: {
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  isLastStep: boolean;
}) {
  if (isLastStep) return null; // Step 5 handles its own submit button

  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 1 || loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Saving...
          </>
        ) : (
          'Next →'
        )}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const INITIAL_FORM: WizardForm = {
  app_name: '',
  app_code: '',
  portfolio: '',
  alert_owner_email: '',
  alert_owner_team: '',
  created_by: '',
  notes: '',
  hosting_platform: '',
  tech_stack: '',
  signals: [],
  environments: ['PROD'],
  exporters: [],
  sampling_rate: 0.1,
  log_format: 'json',
};

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const template = searchParams.get('template');

  const [state, setState] = useState<WizardState>({
    form: INITIAL_FORM,
    currentStep: 1,
    onboardingId: null,
    submitting: false,
    error: null,
    submitted: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pre-populate app code from template query param
  useEffect(() => {
    if (template) {
      setState((prev) => ({
        ...prev,
        form: { ...prev.form, app_code: template.toUpperCase().substring(0, 12) },
      }));
    }
  }, [template]);

  /* ---- helpers ---- */

  function setFormField(field: keyof WizardForm, value: string) {
    setState((prev) => ({
      ...prev,
      form: { ...prev.form, [field]: value },
    }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function toggleSignal(key: string) {
    setState((prev) => {
      const signals = prev.form.signals.includes(key)
        ? prev.form.signals.filter((s) => s !== key)
        : [...prev.form.signals, key];
      return { ...prev, form: { ...prev.form, signals } };
    });
    if (fieldErrors.signals) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.signals;
        return next;
      });
    }
  }

  function toggleEnvironment(key: string) {
    setState((prev) => {
      const envs = prev.form.environments.includes(key)
        ? prev.form.environments.filter((e) => e !== key)
        : [...prev.form.environments, key];
      return { ...prev, form: { ...prev.form, environments: envs } };
    });
  }

  function setSamplingRate(v: number) {
    setState((prev) => ({ ...prev, form: { ...prev.form, sampling_rate: v } }));
  }

  function setLogFormat(v: string) {
    setState((prev) => ({ ...prev, form: { ...prev.form, log_format: v } }));
  }

  /* ---- step navigation ---- */

  async function handleNext() {
    const { form, currentStep, onboardingId } = state;

    // Validate current step
    let errors: Record<string, string> = {};
    if (currentStep === 1) errors = validateStep1(form);
    else if (currentStep === 2) errors = validateStep2(form);
    else if (currentStep === 3) errors = validateStep3(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      if (currentStep === 1) {
        // Create onboarding on step 1 next
        const payload = {
          appName: form.app_name,
          portfolio: form.portfolio,
          appCode: form.app_code,
          description: form.notes || `Onboarding for ${form.app_name}`,
          hostingPlatform: 'AKS' as const,
          techStack: 'JAVA_SPRING' as const,
          runtimeVersion: '',
          telemetrySignals: [] as ('METRICS' | 'LOGS' | 'TRACES' | 'PROFILING' | 'RUM' | 'SYNTHETICS')[],
          technicalConfig: {
            samplingRate: form.sampling_rate,
            retentionDays: 30,
            customLabels: {},
            autoInstrumentation: true,
          },
          alertOwnerEmail: form.alert_owner_email,
          alertOwnerTeam: form.alert_owner_team,
          escalationPolicy: '',
          oncallSchedule: '',
          environmentReadiness: {
            DEV: { enabled: form.environments.includes('DEV') },
            QA: { enabled: form.environments.includes('QA') },
            STAGING: { enabled: false },
            PROD: { enabled: true },
          },
          dependencies: {
            upstream: [],
            downstream: [],
            databases: [],
            messageQueues: [],
          },
          dataClassification: 'internal',
          complianceNotes: form.notes,
          createdBy: form.created_by,
        };
        const response = await createOnboarding(payload);
        setState((prev) => ({
          ...prev,
          onboardingId: response.id,
          currentStep: 2,
          submitting: false,
        }));
      } else if (currentStep === 2 || currentStep === 3 || currentStep === 4) {
        // Best-effort update for steps 2-4
        if (onboardingId) {
          const signalMap: Record<string, 'METRICS' | 'LOGS' | 'TRACES' | 'PROFILING' | 'RUM' | 'SYNTHETICS'> = {
            metrics: 'METRICS',
            logs: 'LOGS',
            traces: 'TRACES',
            profiles: 'PROFILING',
            rum: 'RUM',
          };
          const mappedSignals = form.signals
            .map((s) => signalMap[s])
            .filter((s): s is 'METRICS' | 'LOGS' | 'TRACES' | 'PROFILING' | 'RUM' | 'SYNTHETICS' => Boolean(s));

          await updateOnboarding(onboardingId, {
            appName: form.app_name,
            appCode: form.app_code,
            telemetrySignals: mappedSignals,
            technicalConfig: {
              samplingRate: form.sampling_rate,
              retentionDays: 30,
              customLabels: {},
              autoInstrumentation: true,
            },
          }).catch(() => {
            // Best-effort — don't block navigation on update error
          });
        }
        setState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          submitting: false,
        }));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  }

  function handleBack() {
    if (state.currentStep > 1) {
      setState((prev) => ({ ...prev, currentStep: prev.currentStep - 1, error: null }));
    }
  }

  async function handleSubmit() {
    if (!state.onboardingId) {
      setState((prev) => ({
        ...prev,
        error: 'Onboarding ID is missing. Please go back to step 1 and try again.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      await submitOnboarding(state.onboardingId);
      setState((prev) => ({ ...prev, submitting: false, submitted: true }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit onboarding.';
      setState((prev) => ({ ...prev, submitting: false, error: message }));
    }
  }

  function handleNavigateDone() {
    navigate('/');
  }

  /* ---- render ---- */

  const { form, currentStep, submitting, error, submitted } = state;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">
          {template
            ? `New Onboarding — ${template}`
            : 'New Onboarding Request'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure observability for your service in 5 easy steps.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        {/* Global error banner (not field-level) */}
        {error && currentStep !== 5 && (
          <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-700">Error</p>
              <p className="mt-0.5 text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <Step1 form={form} onChange={setFormField} errors={fieldErrors} />
        )}
        {currentStep === 2 && (
          <Step2 form={form} onChange={setFormField} errors={fieldErrors} />
        )}
        {currentStep === 3 && (
          <Step3
            form={form}
            onToggleSignal={toggleSignal}
            onToggleEnvironment={toggleEnvironment}
            errors={fieldErrors}
          />
        )}
        {currentStep === 4 && (
          <Step4
            form={form}
            onSamplingChange={setSamplingRate}
            onLogFormatChange={setLogFormat}
          />
        )}
        {currentStep === 5 && (
          <Step5
            form={form}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
            submitted={submitted}
            onNavigateDone={handleNavigateDone}
          />
        )}

        {/* Navigation */}
        <NavButtons
          currentStep={currentStep}
          onBack={handleBack}
          onNext={handleNext}
          loading={submitting}
          isLastStep={currentStep === 5}
        />
      </div>
    </div>
  );
}
