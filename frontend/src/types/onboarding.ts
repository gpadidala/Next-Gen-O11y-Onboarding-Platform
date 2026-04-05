/* -------------------------------------------------------------------------- */
/*  Onboarding domain types                                                   */
/* -------------------------------------------------------------------------- */

/* ---- Enum-like const objects + union types ---- */

export const HostingPlatform = {
  PCF: 'PCF',
  PKS: 'PKS',
  EKS: 'EKS',
  AKS: 'AKS',
  GKE: 'GKE',
  ON_PREM: 'ON_PREM',
  SERVERLESS: 'SERVERLESS',
} as const;

export type HostingPlatform =
  (typeof HostingPlatform)[keyof typeof HostingPlatform];

export const TechStack = {
  JAVA_SPRING: 'JAVA_SPRING',
  DOTNET: 'DOTNET',
  NODE_JS: 'NODE_JS',
  PYTHON: 'PYTHON',
  GO: 'GO',
  RUBY: 'RUBY',
  PHP: 'PHP',
  RUST: 'RUST',
} as const;

export type TechStack = (typeof TechStack)[keyof typeof TechStack];

export const OnboardingStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PROVISIONING: 'PROVISIONING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type OnboardingStatus =
  (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

export const TelemetrySignal = {
  METRICS: 'METRICS',
  LOGS: 'LOGS',
  TRACES: 'TRACES',
  PROFILING: 'PROFILING',
  RUM: 'RUM',
  SYNTHETICS: 'SYNTHETICS',
} as const;

export type TelemetrySignal =
  (typeof TelemetrySignal)[keyof typeof TelemetrySignal];

/* ---- Supporting types ---- */

export interface TechnicalConfig {
  /** Sampling rate for traces (0.0 - 1.0). */
  samplingRate: number;
  /** Retention period in days. */
  retentionDays: number;
  /** Custom labels / tags attached to all telemetry. */
  customLabels: Record<string, string>;
  /** Whether to enable automatic instrumentation. */
  autoInstrumentation: boolean;
  /** OTel collector endpoint override (optional). */
  collectorEndpoint?: string;
  /** Extra scrape targets for Prometheus metrics. */
  additionalScrapeTargets?: string[];
}

export interface EnvironmentConfig {
  enabled: boolean;
  namespace?: string;
  replicas?: number;
  resourceQuota?: string;
}

export interface EnvironmentReadiness {
  DEV: EnvironmentConfig;
  QA: EnvironmentConfig;
  STAGING: EnvironmentConfig;
  PROD: EnvironmentConfig;
}

export interface Dependencies {
  /** Upstream services this app depends on. */
  upstream: string[];
  /** Downstream consumers of this app. */
  downstream: string[];
  /** Databases used. */
  databases: string[];
  /** Message queues / event buses. */
  messageQueues: string[];
}

/* ---- Wizard form data (all 9 steps) ---- */

export interface OnboardingFormData {
  /* Step 1 - Application Identity */
  appName: string;
  portfolio: string;
  appCode: string;
  description: string;

  /* Step 2 - Platform & Stack */
  hostingPlatform: HostingPlatform | '';
  techStack: TechStack | '';
  runtimeVersion: string;

  /* Step 3 - Telemetry Scope */
  telemetrySignals: TelemetrySignal[];

  /* Step 4 - Technical Configuration */
  technicalConfig: TechnicalConfig;

  /* Step 5 - Alert & Ownership */
  alertOwnerEmail: string;
  alertOwnerTeam: string;
  escalationPolicy: string;
  oncallSchedule: string;

  /* Step 6 - Environment Readiness */
  environmentReadiness: EnvironmentReadiness;

  /* Step 7 - Dependencies */
  dependencies: Dependencies;

  /* Step 8 - Governance Confirmation */
  governanceAcknowledged: boolean;
  dataClassification: string;
  complianceNotes: string;

  /* Step 9 - Review & Submit */
  reviewConfirmed: boolean;
}

/* ---- API request / response shapes ---- */

/** Matches the backend OnboardingCreate Pydantic schema (snake_case). */
export interface OnboardingCreate {
  app_name: string;
  app_code: string;
  portfolio: string;
  hosting_platform: string;
  tech_stack: string;
  alert_owner_email: string;
  alert_owner_team: string;
  created_by: string;
  notes?: string | null;
}

/** Matches the backend OnboardingUpdate Pydantic schema (snake_case, all optional). */
export interface OnboardingUpdate {
  app_name?: string;
  portfolio?: string;
  hosting_platform?: string;
  tech_stack?: string;
  alert_owner_email?: string;
  alert_owner_team?: string;
  notes?: string | null;
}

export interface OnboardingResponse {
  id: string;
  status: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  appName: string;
  portfolio: string;
  appCode: string;
  description: string;
  hostingPlatform: HostingPlatform;
  techStack: TechStack;
  runtimeVersion: string;
  telemetrySignals: TelemetrySignal[];
  technicalConfig: TechnicalConfig;
  alertOwnerEmail: string;
  alertOwnerTeam: string;
  escalationPolicy: string;
  oncallSchedule: string;
  environmentReadiness: EnvironmentReadiness;
  dependencies: Dependencies;
  dataClassification: string;
  complianceNotes: string;
}

export interface OnboardingListParams {
  page?: number;
  pageSize?: number;
  status?: OnboardingStatus;
  portfolio?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OnboardingListResponse {
  data: OnboardingResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/*  Extended wizard types for steps 1-5                                       */
/* -------------------------------------------------------------------------- */

/** Database type options for DB plugin telemetry */
export type DatabaseType = 'PostgreSQL' | 'MySQL' | 'MSSQL' | 'Oracle';

/** Log format options */
export type LogFormat = 'json' | 'text' | 'syslog';

/** Exporter type options */
export type ExporterType = 'otel-collector' | 'prometheus' | 'datadog' | 'custom';

/** Platform dependency options */
export type PlatformDependency =
  | 'postgres-exporter'
  | 'redis-exporter'
  | 'mongodb-exporter'
  | 'kafka-exporter'
  | 'elasticsearch-exporter'
  | 'nginx-exporter'
  | 'rabbitmq-exporter'
  | 'mysql-exporter';

/** Portfolio options */
export const PORTFOLIO_OPTIONS = [
  'Digital Banking',
  'Wealth Management',
  'Insurance',
  'Payments',
  'Lending',
  'Capital Markets',
  'Risk & Compliance',
  'Platform Engineering',
  'Customer Experience',
  'Data & Analytics',
] as const;

export type Portfolio = (typeof PORTFOLIO_OPTIONS)[number];

/** Hosting platform display labels */
export const HOSTING_PLATFORM_OPTIONS: Record<string, string> = {
  AKS: 'Azure Kubernetes Service (AKS)',
  VM: 'Virtual Machine (VM)',
  APIM: 'Azure API Management (APIM)',
  GCP: 'Google Cloud Platform (GCP)',
  AzureFunctions: 'Azure Functions',
} as const;

/** Tech stack display labels */
export const TECH_STACK_OPTIONS: Record<string, string> = {
  JAVA_SPRING: 'Java Spring Boot',
  DOTNET: '.NET',
  NODE_JS: 'Node.js',
  PYTHON: 'Python',
  GO: 'Go',
} as const;

/** Telemetry signal metadata for the selection grid */
export interface TelemetrySignalMeta {
  id: TelemetrySignal;
  label: string;
  description: string;
  iconName: string;
}

export const TELEMETRY_SIGNAL_OPTIONS: TelemetrySignalMeta[] = [
  { id: 'METRICS', label: 'Metrics', description: 'Time-series numerical measurements', iconName: 'BarChart3' },
  { id: 'LOGS', label: 'Logs', description: 'Structured and unstructured log events', iconName: 'FileText' },
  { id: 'TRACES', label: 'Traces', description: 'Distributed request tracing', iconName: 'Route' },
  { id: 'PROFILING', label: 'Profiles', description: 'Continuous profiling data', iconName: 'Cpu' },
  { id: 'RUM', label: 'RUM', description: 'Real user monitoring for browsers', iconName: 'Globe' },
  { id: 'SYNTHETICS', label: 'Faro', description: 'Frontend observability with Grafana Faro', iconName: 'Radar' },
];

/** Extended telemetry signals including dashboards and DB plugins */
export const EXTENDED_TELEMETRY_OPTIONS: TelemetrySignalMeta[] = [
  ...TELEMETRY_SIGNAL_OPTIONS,
  { id: 'METRICS' as TelemetrySignal, label: 'Grafana Dashboards', description: 'Pre-built Grafana dashboards', iconName: 'LayoutDashboard' },
];

/** Platform dependency options with labels */
export const PLATFORM_DEPENDENCY_OPTIONS: Array<{ value: PlatformDependency; label: string }> = [
  { value: 'postgres-exporter', label: 'PostgreSQL Exporter' },
  { value: 'redis-exporter', label: 'Redis Exporter' },
  { value: 'mongodb-exporter', label: 'MongoDB Exporter' },
  { value: 'kafka-exporter', label: 'Kafka Exporter' },
  { value: 'elasticsearch-exporter', label: 'Elasticsearch Exporter' },
  { value: 'nginx-exporter', label: 'Nginx Exporter' },
  { value: 'rabbitmq-exporter', label: 'RabbitMQ Exporter' },
  { value: 'mysql-exporter', label: 'MySQL Exporter' },
];

/** Obs team email domains that should NOT be used as alert owners */
export const OBS_TEAM_EMAILS = [
  'obs-team@company.com',
  'observability@company.com',
  'monitoring@company.com',
  'grafana-admin@company.com',
  'o11y-platform@company.com',
] as const;

/** Platform + stack combination info cards */
export const PLATFORM_STACK_INFO: Record<string, string> = {
  'AKS_JAVA_SPRING': 'AKS + Java Spring Boot: Most common combination with full telemetry support. Auto-instrumentation available via OTel Java agent.',
  'AKS_DOTNET': 'AKS + .NET: Full support with OpenTelemetry .NET SDK. Auto-instrumentation available for ASP.NET Core.',
  'AKS_NODE_JS': 'AKS + Node.js: Supported with OTel Node.js SDK. Automatic spans for Express/Fastify frameworks.',
  'AKS_PYTHON': 'AKS + Python: Supported with OTel Python SDK. Auto-instrumentation for Django/Flask/FastAPI.',
  'AKS_GO': 'AKS + Go: Supported with OTel Go SDK. Manual instrumentation required for most frameworks.',
  'VM_JAVA_SPRING': 'VM + Java Spring Boot: Requires Prometheus JMX exporter and Grafana Agent for metric collection.',
  'VM_DOTNET': 'VM + .NET: Requires OpenTelemetry Collector sidecar. Prometheus exporter available for metrics.',
  'VM_NODE_JS': 'VM + Node.js: Grafana Agent recommended for log and metric collection. PM2 integration available.',
  'VM_PYTHON': 'VM + Python: Grafana Agent for log collection. StatsD or Prometheus client for metrics.',
  'VM_GO': 'VM + Go: Native Prometheus exposition via /metrics endpoint. Grafana Agent for log collection.',
  'GCP_JAVA_SPRING': 'GCP + Java Spring Boot: Cloud Trace and Cloud Monitoring integration available. OTel agent supported.',
  'GCP_DOTNET': 'GCP + .NET: Cloud Trace exporter available. Stackdriver integration for logs and metrics.',
  'GCP_NODE_JS': 'GCP + Node.js: Cloud Functions and Cloud Run supported. Native Cloud Trace integration.',
  'GCP_PYTHON': 'GCP + Python: Cloud Functions supported. Native Cloud Trace and Cloud Monitoring SDKs.',
  'GCP_GO': 'GCP + Go: Cloud Run and GKE supported. Native Google Cloud observability SDK.',
  'APIM_JAVA_SPRING': 'APIM + Java Spring Boot: API Management gateway metrics and logs. Backend service telemetry via OTel.',
  'APIM_DOTNET': 'APIM + .NET: Native Application Insights integration. Custom policy-based telemetry.',
  'APIM_NODE_JS': 'APIM + Node.js: Gateway analytics with backend OTel instrumentation.',
  'APIM_PYTHON': 'APIM + Python: Gateway-level tracing with backend Python OTel SDK.',
  'APIM_GO': 'APIM + Go: Gateway metrics with manual backend instrumentation.',
  'AzureFunctions_JAVA_SPRING': 'Azure Functions + Java: Application Insights auto-collection. OTel exporter for Grafana.',
  'AzureFunctions_DOTNET': 'Azure Functions + .NET: Built-in Application Insights. Export to Grafana via OTLP.',
  'AzureFunctions_NODE_JS': 'Azure Functions + Node.js: Application Insights SDK with OTel bridge.',
  'AzureFunctions_PYTHON': 'Azure Functions + Python: Application Insights integration. OpenCensus bridge available.',
  'AzureFunctions_GO': 'Azure Functions + Go: Custom handler with manual instrumentation required.',
};

/** Wizard step metadata */
export interface WizardStepMeta {
  number: number;
  label: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { number: 1, label: 'App Identification', description: 'Basic application details' },
  { number: 2, label: 'Platform & Technology', description: 'Hosting and tech stack' },
  { number: 3, label: 'Telemetry Scope', description: 'Signals and data sources' },
  { number: 4, label: 'Technical Config', description: 'Configuration details' },
  { number: 5, label: 'Dependencies', description: 'Contacts and dependencies' },
  { number: 6, label: 'Environment Readiness', description: 'Environment checklist' },
  { number: 7, label: 'Intelligence View', description: 'AI-powered insights' },
  { number: 8, label: 'Capacity Status', description: 'Resource availability' },
  { number: 9, label: 'Review & Submit', description: 'Final review' },
];

/** Onboarding submission response */
export interface OnboardingSubmitResponse {
  requestId: string;
  status: 'submitted' | 'pending_approval';
  message: string;
}
