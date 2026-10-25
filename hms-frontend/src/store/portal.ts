"use client";

import { create } from "zustand";

/** Small shared state so the layout (badges, consent gate) and pages agree without refetching. */
type PortalState = {
  needsConsent: boolean;
  unreadMessages: number;
  policyVersion: string;
  setMeta: (m: Partial<Omit<PortalState, "setMeta">>) => void;
};
export const usePortal = create<PortalState>((set) => ({
  needsConsent: false,
  unreadMessages: 0,
  policyVersion: "",
  setMeta: (m) => set(m),
}));
