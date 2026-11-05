"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: number;
  name: string;
  email: string;
  two_factor_enabled?: boolean;
  staff_profile?: {
    id?: number;
    position?: string;
    specialization?: string;
    phone?: string | null;
    license_number?: string | null;
    languages?: string | null;
    department?: { name: string };
  } | null;
};

type AuthData = {
  token: string;
  user: User;
  roles: string[];
  permissions: string[];
};

type AuthState = AuthData & {
  setAuth: (d: AuthData) => void;
  clear: () => void;
  hasPermission: (p: string) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: "",
      user: null as unknown as User,
      roles: [],
      permissions: [],
      setAuth: (d) => set({ ...d }),
      clear: () => set({ token: "", user: null as unknown as User, roles: [], permissions: [] }),
      hasPermission: (p) => get().permissions.includes(p),
    }),
    { name: "hms-auth" }
  )
);