import { Sparkles, Copy, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SimilarityMatchResult } from '@/types/similarity';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface SimilarityCardProps {
  /** The similarity match data */
  match: SimilarityMatchResult;
  /** Called when the user clicks "Adopt" */
  onAdopt?: (match: SimilarityMatchResult) => void;
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function scoreStatus(score: number) {
  if (score >= 0.8) return 'success' as const;
  if (score >= 0.5) return 'warning' as const;
  return 'neutral' as const;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function SimilarityCard({ match, onAdopt, className }: SimilarityCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-surface-primary p-4 shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      {/* Header: App name + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles
            className="h-4 w-4 shrink-0 text-brand-500"
            aria-hidden="true"
          />
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {match.appName}
          </h3>
        </div>
        <Badge
          status={scoreStatus(match.score)}
          size="sm"
          aria-label={`Similarity score: ${formatScore(match.score)}`}
        >
          {formatScore(match.score)} match
        </Badge>
      </div>

      {/* Portfolio & platform info */}
      <p className="mt-1.5 text-xs text-slate-500">
        {match.portfolio} &middot; {match.hostingPlatform} &middot; {match.techStack}
      </p>

      {/* Match reason */}
      <p className="mt-2 text-xs text-slate-600 line-clamp-2">
        {match.reason}
      </p>

      {/* Signal tags */}
      {match.signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.signals.map((signal) => (
            <Badge key={signal} status="info" size="sm">
              {signal}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowRight className="h-3.5 w-3.5" />}
          onClick={() => onAdopt?.(match)}
        >
          Adopt
        </Button>
      </div>
    </div>
  );
}

// suppress unused import warning — Copy is available for future clipboard action
void Copy;

export { SimilarityCard };
export default SimilarityCard;
