/* -------------------------------------------------------------------------- */
/*  Artifact generation types                                                 */
/* -------------------------------------------------------------------------- */

export const ArtifactType = {
  CHANGE_REQUEST: 'CHANGE_REQUEST',
  EPIC: 'EPIC',
  DASHBOARD_JSON: 'DASHBOARD_JSON',
  ALERT_RULES: 'ALERT_RULES',
  OTEL_CONFIG: 'OTEL_CONFIG',
  RUNBOOK: 'RUNBOOK',
} as const;

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export interface ArtifactGenerateRequest {
  onboardingId: string;
  /** Which artifact types to generate. If omitted, all are generated. */
  types?: ArtifactType[];
}

export interface ArtifactFile {
  type: ArtifactType;
  /** Filename (e.g. "dashboard.json", "alerts.yaml"). */
  filename: string;
  /** The rendered content as a string. */
  content: string;
  /** MIME type of the artifact. */
  mimeType: string;
}

export interface ArtifactPreviewResponse {
  onboardingId: string;
  artifacts: ArtifactFile[];
  /** ISO timestamp when preview was generated. */
  generatedAt: string;
}

export interface ArtifactResponse {
  onboardingId: string;
  artifacts: ArtifactFile[];
  /** Whether all artifacts were successfully generated. */
  complete: boolean;
  /** ISO timestamp when artifacts were persisted. */
  generatedAt: string;
}

/** Change Request payload shape for ServiceNow / ITSM integration. */
export interface CRPayload {
  summary: string;
  description: string;
  category: string;
  priority: string;
  assignmentGroup: string;
  requestedBy: string;
  plannedStartDate: string;
  plannedEndDate: string;
  rollbackPlan: string;
  /** Linked onboarding ID for traceability. */
  onboardingId: string;
}

/** Epic payload shape for Jira / project management integration. */
export interface EpicPayload {
  title: string;
  description: string;
  project: string;
  labels: string[];
  components: string[];
  stories: EpicStory[];
  /** Linked onboarding ID for traceability. */
  onboardingId: string;
}

export interface EpicStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
}
