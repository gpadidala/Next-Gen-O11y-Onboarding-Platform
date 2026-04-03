import { useEffect, useState, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  Copy,
  ExternalLink,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText,
  Bell,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboarding } from '../context/OnboardingContext';
import type { SimilarityMatchResult } from '@/types/similarity';

/* -------------------------------------------------------------------------- */
/*  Types for enriched intelligence data                                      */
/* -------------------------------------------------------------------------- */

interface IntelligenceMatch extends SimilarityMatchResult {
  exporters: string[];
  dashboards: string[];
  alertRules: string[];
  playbookLinks: string[];
  pitfalls: string[];
}

interface IntelligenceResponse {
  matches: IntelligenceMatch[];
  suggestedExporters: string[];
  recommendedDashboards: string[];
  knownPitfalls: string[];
  totalEvaluated: number;
  searchDurationMs: number;
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-slate-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded-full bg-slate-200" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SimilarityCard                                                            */
/* -------------------------------------------------------------------------- */

interface SimilarityCardProps {
  match: IntelligenceMatch;
  onAdopt: (match: IntelligenceMatch) => void;
}

function SimilarityCard({ match, onAdopt }: SimilarityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const scorePercent = Math.round(match.score * 100);
  const scoreStatus =
    scorePercent >= 80 ? 'success' : scorePercent >= 50 ? 'warning' : 'neutral';

  return (
    <Card hoverable className="transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
            <Brain className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              {match.appName}
            </h4>
            <p className="text-xs text-slate-500">{match.portfolio}</p>
          </div>
        </div>
        <Badge status={scoreStatus} size="md">
          {scorePercent}% match
        </Badge>
      </div>

      {/* Match reason */}
      <p className="mt-3 text-sm text-slate-600">{match.reason}</p>

      {/* Signal badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {match.signals.map((sig) => (
          <Badge key={sig} status="info" size="sm">
            {sig}
          </Badge>
        ))}
        <Badge status="neutral" size="sm">
          {match.hostingPlatform}
        </Badge>
        <Badge status="neutral" size="sm">
          {match.techStack}
        </Badge>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Show Details
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {/* Exporters */}
          {match.exporters.length > 0 && (
            <DetailSection
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Exporters"
              items={match.exporters}
            />
          )}

          {/* Dashboards */}
          {match.dashboards.length > 0 && (
            <DetailSection
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              label="Dashboards"
              items={match.dashboards}
            />
          )}

          {/* Alert Rules */}
          {match.alertRules.length > 0 && (
            <DetailSection
              icon={<Bell className="h-3.5 w-3.5" />}
              label="Alert Rules"
              items={match.alertRules}
            />
          )}

          {/* Playbook Links */}
          {match.playbookLinks.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <BookOpen className="h-3.5 w-3.5" />
                Playbooks
              </p>
              <ul className="mt-1 space-y-0.5">
                {match.playbookLinks.map((link) => (
                  <li key={link}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pitfalls */}
          {match.pitfalls.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Known Pitfalls
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-slate-600">
                {match.pitfalls.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          icon={<Copy className="h-3.5 w-3.5" />}
          onClick={() => onAdopt(match)}
        >
          Adopt Configuration
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail Section Helper                                                     */
/* -------------------------------------------------------------------------- */

function DetailSection({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
        {icon}
        {label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge key={item} status="neutral" size="sm">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function Step7IntelligenceView() {
  const { formData, updateFormData, nextStep, prevStep } = useOnboarding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [adopted, setAdopted] = useState<string | null>(null);

  /* ---- Fetch similarity data on mount ---- */

  useEffect(() => {
    let cancelled = false;

    async function fetchIntelligence() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/similarity/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${formData.appName} ${formData.description}`,
            hostingPlatform: formData.hostingPlatform || undefined,
            techStack: formData.techStack || undefined,
            signals: formData.telemetrySignals,
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const result: IntelligenceResponse = await response.json();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch intelligence data',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchIntelligence();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Adopt handler ---- */

  const handleAdopt = useCallback(
    (match: IntelligenceMatch) => {
      updateFormData({
        hostingPlatform: match.hostingPlatform,
        techStack: match.techStack,
        telemetrySignals: match.signals,
      });
      setAdopted(match.onboardingId);
    },
    [updateFormData],
  );

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Intelligence View
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          AI-powered recommendations based on similar onboardings in your
          organization.
        </p>
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Search Failed
              </h4>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Matches */}
      {!loading && !error && data && data.matches.length === 0 && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Info className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                No Similar Onboardings Found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                This appears to be a new pattern. Your configuration will serve
                as a reference for future onboardings.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Adopted banner */}
      {adopted && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="flex items-center gap-2 text-sm text-green-800">
            <Copy className="h-4 w-4" />
            Configuration adopted successfully. Review the updated values in
            previous steps.
          </p>
        </div>
      )}

      {/* Match Results */}
      {!loading && !error && data && data.matches.length > 0 && (
        <div className="space-y-6">
          {/* Similar Apps */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Top Similar Applications
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({data.totalEvaluated} evaluated in {data.searchDurationMs}ms)
              </span>
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.matches.map((match) => (
                <SimilarityCard
                  key={match.onboardingId}
                  match={match}
                  onAdopt={handleAdopt}
                />
              ))}
            </div>
          </div>

          {/* Suggested Exporters */}
          {data.suggestedExporters.length > 0 && (
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span>Suggested Exporters</span>
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                {data.suggestedExporters.map((exp) => (
                  <Badge key={exp} status="info" size="md">
                    {exp}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Recommended Dashboards */}
          {data.recommendedDashboards.length > 0 && (
            <Card
              header={
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-500" />
                  <span>Recommended Dashboards</span>
                </div>
              }
            >
              <ul className="space-y-1.5">
                {data.recommendedDashboards.map((db) => (
                  <li
                    key={db}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {db}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Known Pitfalls */}
          {data.knownPitfalls.length > 0 && (
            <Card
              header={
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Known Pitfalls</span>
                </div>
              }
            >
              <ul className="space-y-2">
                {data.knownPitfalls.map((pitfall) => (
                  <li
                    key={pitfall}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    {pitfall}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Button variant="secondary" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>Continue</Button>
      </div>
    </div>
  );
}
