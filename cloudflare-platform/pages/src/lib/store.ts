import { create } from 'zustand';

export type UserRole = 'admin' | 'trader' | 'ipp' | 'offtaker' | 'carbon_fund' | 'epc' | 'advisor' | 'generator' | 'ipp_developer' | 'regulator' | 'observer' | 'lender';

interface User {
  id: string;
  email: string;
  role: UserRole;
  company_name: string;
  kyc_status: string;
  kyc_checks_passed?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  activeRole: UserRole | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const storedToken = localStorage.getItem('nxt_token');
  const storedUser = localStorage.getItem('nxt_user');
  let parsed: User | null = null;
  try { parsed = storedUser ? JSON.parse(storedUser) : null; } catch { parsed = null; }

  return {
    user: parsed,
    token: storedToken,
    isAuthenticated: !!storedToken,
    activeRole: parsed?.role || null,

    login: (token, user) => {
      localStorage.setItem('nxt_token', token);
      localStorage.setItem('nxt_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, activeRole: user.role });
    },

    logout: async () => {
      // Best-effort API call to blacklist token BEFORE clearing it
      try {
        const { authAPI } = await import('./api');
        await authAPI.logout();
      } catch { /* best-effort */ }
      // Clear local state after API call so the token is still available for the request
      localStorage.removeItem('nxt_token');
      localStorage.removeItem('nxt_user');
      set({ user: null, token: null, isAuthenticated: false, activeRole: null });
    },

    switchRole: (role) => {
      set((state) => {
        if (state.user) {
          const updated = { ...state.user, role };
          localStorage.setItem('nxt_user', JSON.stringify(updated));
          return { user: updated, activeRole: role };
        }
        return { activeRole: role };
      });
    },

    setUser: (user) => {
      localStorage.setItem('nxt_user', JSON.stringify(user));
      set({ user, activeRole: user.role });
    },
  };
});

// Notification store
interface NotificationState {
  notifications: Array<{ id: string; title: string; body: string; type: string; read: boolean; created_at: string }>;
  unreadCount: number;
  setNotifications: (n: NotificationState['notifications']) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  }),
  markRead: (id) => {
    set((state) => {
      const wasUnread = state.notifications.some((n) => n.id === id && !n.read);
      return {
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
    // Sync with backend
    import('./api').then(({ notificationsAPI }) => notificationsAPI.markRead(id)).catch(() => {});
  },
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    // Sync with backend
    import('./api').then(({ notificationsAPI }) => notificationsAPI.markAllRead()).catch(() => {});
  },
}));
