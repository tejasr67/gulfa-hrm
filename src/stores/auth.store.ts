import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSession } from "@/types";

type AuthState = {
  session: UserSession | null;
  isLoading: boolean;
  setSession: (session: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
  // NOTE: hasPermission is UI-only (controls visibility of buttons/links).
  // It must never be the sole authorization gate — server actions and API
  // routes enforce permissions server-side via requirePermission().
  hasPermission: (permission: string) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: false,  // false by default; set to true only during active auth checks
      setSession: (session) => set({ session, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      clearSession: () => set({ session: null, isLoading: false }),
      hasPermission: (permission) => {
        const { session } = get();
        if (!session) return false;
        if (session.role === "SUPER_ADMIN" || session.role === "HR_ADMIN") return true;
        return session.permissions.includes(permission);
      },
    }),
    {
      name: "gulfa-hrm-auth",
      // Only persist identity, not permissions — permissions must be re-fetched
      // on every login to reflect server-side changes.
      partialize: (state) => ({
        session: state.session
          ? { id: state.session.id, email: state.session.email, companyId: state.session.companyId, employeeId: state.session.employeeId, role: state.session.role, permissions: [] }
          : null,
      }),
    }
  )
);
