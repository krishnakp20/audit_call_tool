import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  selectedClientId: number | null;
  toggleSidebar: () => void;
  setClientId: (clientId: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  selectedClientId: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setClientId: (clientId) => set({ selectedClientId: clientId })
}));
