/* -------------------------------------------------------------------------- */
/*  UI-wide Zustand store (sidebar, notifications)                            */
/* -------------------------------------------------------------------------- */

import { create } from 'zustand';

/* ---- Notification type ---- */

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  title: string;
  message?: string;
  variant: NotificationVariant;
  /** Auto-dismiss timeout in ms. `0` means sticky. */
  duration: number;
}

/* ---- Store interface ---- */

export interface UIStore {
  sidebarOpen: boolean;
  notifications: Notification[];

  /** Toggle sidebar open / closed. */
  toggleSidebar: () => void;
  /** Explicitly set sidebar state. */
  setSidebarOpen: (open: boolean) => void;
  /** Add a notification. Returns the generated ID. */
  addNotification: (
    notification: Omit<Notification, 'id'>,
  ) => string;
  /** Remove a notification by ID. */
  removeNotification: (id: string) => void;
  /** Clear all notifications. */
  clearNotifications: () => void;
}

/* ---- Helpers ---- */

let notificationCounter = 0;

function generateId(): string {
  notificationCounter += 1;
  return `notif-${Date.now()}-${notificationCounter}`;
}

/* ---- Store implementation ---- */

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  notifications: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addNotification: (notification) => {
    const id = generateId();
    const entry: Notification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, entry],
    }));

    // Auto-dismiss if duration > 0
    if (entry.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, entry.duration);
    }

    return id;
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
