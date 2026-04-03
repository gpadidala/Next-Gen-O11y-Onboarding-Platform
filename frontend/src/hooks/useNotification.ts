/* -------------------------------------------------------------------------- */
/*  Notification convenience hook                                             */
/* -------------------------------------------------------------------------- */

import { useCallback, useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import type { NotificationVariant } from '@/store/uiStore';

/* ---- Default durations per variant (ms) ---- */

const DEFAULT_DURATION: Record<NotificationVariant, number> = {
  success: 5_000,
  info: 5_000,
  warning: 8_000,
  error: 0, // errors are sticky by default
};

/* ---- Hook return type ---- */

export interface UseNotificationReturn {
  /** Show a success notification. */
  success: (title: string, message?: string) => string;
  /** Show an error notification (sticky by default). */
  error: (title: string, message?: string) => string;
  /** Show a warning notification. */
  warning: (title: string, message?: string) => string;
  /** Show an info notification. */
  info: (title: string, message?: string) => string;
  /** Remove a specific notification by ID. */
  dismiss: (id: string) => void;
  /** Clear all notifications. */
  clearAll: () => void;
}

/* ---- Hook implementation ---- */

/**
 * Convenience wrapper around the UI store's notification system.
 *
 * @example
 * ```ts
 * const notify = useNotification();
 * notify.success('Saved!', 'Onboarding draft saved successfully.');
 * notify.error('Submission failed', error.detail);
 * ```
 */
export function useNotification(): UseNotificationReturn {
  const addNotification = useUIStore((s) => s.addNotification);
  const removeNotification = useUIStore((s) => s.removeNotification);
  const clearNotifications = useUIStore((s) => s.clearNotifications);

  const show = useCallback(
    (variant: NotificationVariant, title: string, message?: string) =>
      addNotification({
        title,
        message,
        variant,
        duration: DEFAULT_DURATION[variant],
      }),
    [addNotification],
  );

  const success = useCallback(
    (title: string, message?: string) => show('success', title, message),
    [show],
  );

  const error = useCallback(
    (title: string, message?: string) => show('error', title, message),
    [show],
  );

  const warning = useCallback(
    (title: string, message?: string) => show('warning', title, message),
    [show],
  );

  const info = useCallback(
    (title: string, message?: string) => show('info', title, message),
    [show],
  );

  const dismiss = useCallback(
    (id: string) => removeNotification(id),
    [removeNotification],
  );

  const clearAll = useCallback(
    () => clearNotifications(),
    [clearNotifications],
  );

  return useMemo(
    () => ({ success, error, warning, info, dismiss, clearAll }),
    [success, error, warning, info, dismiss, clearAll],
  );
}
