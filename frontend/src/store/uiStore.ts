import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  selectedClientId: number | null;

  fromDate: string;
  toDate: string;
  dateFilter: string;

  toggleSidebar: () => void;
  setClientId: (clientId: number) => void;

  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
  setDateFilter: (filter: string) => void;
}

const today = new Date().toISOString().slice(0, 10);

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  selectedClientId: null,

  fromDate: today,
  toDate: today,
  dateFilter: "Today",

  toggleSidebar: () =>
    set((s) => ({
      sidebarCollapsed: !s.sidebarCollapsed
    })),

  setClientId: (clientId) =>
    set({
      selectedClientId: clientId
    }),

  setFromDate: (date) =>
    set({
      fromDate: date
    }),

  setToDate: (date) =>
    set({
      toDate: date
    }),

  setDateFilter: (filter) =>
    set({
      dateFilter: filter
    })
}));