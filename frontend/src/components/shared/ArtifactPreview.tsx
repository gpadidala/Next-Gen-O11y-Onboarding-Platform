import { useState, useCallback } from 'react';
import { Copy, Check, FileText, BookOpen, ListChecks } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ArtifactFile } from '@/types/artifact';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ArtifactPreviewProps {
  /** Array of artifact files to preview (typically CR, Epic, Stories) */
  artifacts: ArtifactFile[];
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Tab metadata                                                              */
/* -------------------------------------------------------------------------- */

const tabIcons: Record<string, React.ReactNode> = {
  CHANGE_REQUEST: <FileText className="h-4 w-4" aria-hidden="true" />,
  EPIC: <BookOpen className="h-4 w-4" aria-hidden="true" />,
  DASHBOARD_JSON: <ListChecks className="h-4 w-4" aria-hidden="true" />,
  ALERT_RULES: <ListChecks className="h-4 w-4" aria-hidden="true" />,
  OTEL_CONFIG: <ListChecks className="h-4 w-4" aria-hidden="true" />,
  RUNBOOK: <BookOpen className="h-4 w-4" aria-hidden="true" />,
};

const tabLabels: Record<string, string> = {
  CHANGE_REQUEST: 'CR',
  EPIC: 'Epic',
  DASHBOARD_JSON: 'Dashboard',
  ALERT_RULES: 'Alerts',
  OTEL_CONFIG: 'OTel Config',
  RUNBOOK: 'Runbook',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function ArtifactPreview({ artifacts, className }: ArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeArtifact = artifacts[activeTab];

  const handleCopy = useCallback(async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  }, [activeArtifact]);

  if (artifacts.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-slate-200 bg-surface-primary p-8 text-center',
          className,
        )}
      >
        <FileText className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-sm text-slate-500">No artifacts generated yet.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-surface-primary',
        className,
      )}
    >
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50">
        <div className="flex" role="tablist" aria-label="Artifact tabs">
          {artifacts.map((artifact, index) => {
            const isActive = index === activeTab;
            const label = tabLabels[artifact.type] ?? artifact.filename;
            const icon = tabIcons[artifact.type] ?? (
              <FileText className="h-4 w-4" aria-hidden="true" />
            );

            return (
              <button
                key={artifact.type + index}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`artifact-panel-${index}`}
                onClick={() => {
                  setActiveTab(index);
                  setCopied(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-b-2 border-brand-600 bg-white text-brand-700'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700',
                )}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* Copy button */}
        <div className="pr-2">
          <Button
            variant="ghost"
            size="sm"
            icon={
              copied ? (
                <Check className="h-3.5 w-3.5 text-status-healthy" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )
            }
            onClick={handleCopy}
            aria-label="Copy artifact content"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Content panel */}
      {activeArtifact && (
        <div
          id={`artifact-panel-${activeTab}`}
          role="tabpanel"
          className="max-h-96 overflow-auto p-4"
        >
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">
            {formatContent(activeArtifact)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatContent(artifact: ArtifactFile): string {
  // Try to pretty-print JSON content
  if (
    artifact.mimeType === 'application/json' ||
    artifact.filename.endsWith('.json')
  ) {
    try {
      return JSON.stringify(JSON.parse(artifact.content), null, 2);
    } catch {
      return artifact.content;
    }
  }
  return artifact.content;
}

export { ArtifactPreview };
export default ArtifactPreview;
