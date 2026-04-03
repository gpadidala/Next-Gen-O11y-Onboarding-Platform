/* -------------------------------------------------------------------------- */
/*  Similarity search types                                                   */
/* -------------------------------------------------------------------------- */

import type { HostingPlatform, TechStack, TelemetrySignal } from './onboarding';

export interface SimilaritySearchRequest {
  /** Application name or description to search against. */
  query: string;
  /** Optional filters to narrow the search. */
  hostingPlatform?: HostingPlatform;
  techStack?: TechStack;
  signals?: TelemetrySignal[];
  /** Maximum number of results to return. */
  limit?: number;
}

export interface SimilarityMatchResult {
  /** Onboarding ID of the matched application. */
  onboardingId: string;
  /** Application name. */
  appName: string;
  /** Portfolio the matched app belongs to. */
  portfolio: string;
  /** Cosine similarity score 0-1. */
  score: number;
  /** Hosting platform of the match. */
  hostingPlatform: HostingPlatform;
  /** Tech stack of the match. */
  techStack: TechStack;
  /** Telemetry signals the matched app uses. */
  signals: TelemetrySignal[];
  /** Short explanation of why this was a match. */
  reason: string;
}

export interface SimilaritySearchResponse {
  matches: SimilarityMatchResult[];
  /** Total candidates evaluated. */
  totalEvaluated: number;
  /** Time taken in milliseconds. */
  searchDurationMs: number;
}
