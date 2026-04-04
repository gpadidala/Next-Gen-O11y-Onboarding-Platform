/**
 * useTheme — manages the active theme, persists to localStorage,
 * and applies a data-theme attribute to <html>.
 */

export type ThemeId = 'light' | 'dark' | 'grafana' | 'midnight';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  preview: { bg: string; accent: string; text: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Clean professional light mode',
    preview: { bg: '#ffffff', accent: '#1b6df5', text: '#0f172a' },
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy-on-eyes dark mode',
    preview: { bg: '#1e2234', accent: '#59b0ff', text: '#e2e8f0' },
  },
  {
    id: 'grafana',
    label: 'Grafana',
    description: 'Matches the Grafana UI palette',
    preview: { bg: '#111217', accent: '#ff780a', text: '#d8d9da' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep purple — premium dark',
    preview: { bg: '#13111c', accent: '#a855f7', text: '#e9d5ff' },
  },
];

const STORAGE_KEY = 'o11y_theme';

function applyTheme(id: ThemeId) {
  const html = document.documentElement;
  // Remove all theme classes first
  html.removeAttribute('data-theme');
  if (id !== 'light') {
    html.setAttribute('data-theme', id);
  }
  localStorage.setItem(STORAGE_KEY, id);
}

export function getSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.find((t) => t.id === saved)) return saved;
  } catch {}
  return 'light';
}

import { useState, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => getSavedTheme());

  const setTheme = useCallback((id: ThemeId) => {
    applyTheme(id);
    setThemeState(id);
  }, []);

  return { theme, setTheme, themes: THEMES };
}
