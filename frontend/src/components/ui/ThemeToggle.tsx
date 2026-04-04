/**
 * ThemeToggle — dropdown picker for switching between the 4 app themes.
 * Renders as a small button in the header; click opens a panel below.
 */
import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, type ThemeMeta } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = themes.find((t) => t.id === theme)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--btn-ghost-hover)] text-[var(--text-secondary)]"
        aria-label="Change theme"
        title={`Theme: ${active.label}`}
      >
        {/* Live color swatch */}
        <span
          className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm"
          style={{ background: active.preview.accent }}
        />
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: 'var(--surface-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="px-3 pt-3 pb-1">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Appearance
            </p>
          </div>
          <div className="p-2 space-y-0.5">
            {themes.map((t: ThemeMeta) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
                style={{
                  background: theme === t.id ? 'var(--surface-tertiary)' : 'transparent',
                }}
              >
                {/* Color swatch */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden">
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <rect width="32" height="32" fill={t.preview.bg} />
                    {/* Sidebar strip */}
                    <rect width="9" height="32" fill={t.preview.accent} opacity="0.25" />
                    {/* Accent bar */}
                    <rect x="0" y="0" width="9" height="3" fill={t.preview.accent} />
                    {/* "Cards" */}
                    <rect x="12" y="8" width="17" height="5" rx="1.5" fill={t.preview.text} opacity="0.12" />
                    <rect x="12" y="16" width="17" height="5" rx="1.5" fill={t.preview.text} opacity="0.08" />
                    <rect x="12" y="24" width="10" height="3" rx="1.5" fill={t.preview.accent} opacity="0.5" />
                  </svg>
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t.label}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t.description}
                  </p>
                </div>

                {theme === t.id && (
                  <Check
                    className="h-4 w-4 shrink-0"
                    style={{ color: 'var(--brand-accent)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
