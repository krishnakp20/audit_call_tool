import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const useDashboardSummary = (clientId: number | null, fromDate: string, toDate: string) =>
  useQuery({
    queryKey: ["dashboard-summary", clientId, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/summary", {
        params: {
          client_id: clientId,
          date_from: `${fromDate}T00:00:00`,
          date_to: `${toDate}T23:59:59`
        }
      });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 15000
  });

export const useAgentPerformance = (clientId: number | null, fromDate: string, toDate: string) =>
  useQuery({
    queryKey: ["agent-performance", clientId, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/agent-performance", {
        params: {
          client_id: clientId,
          date_from: `${fromDate}T00:00:00`,
          date_to: `${toDate}T23:59:59`
        }
      });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 20000
  });


export const useQualitySummary = (clientId: number | null,fromDate: string,toDate: string) =>
  useQuery({
    queryKey: ["quality-summary", clientId, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get("/sale-dashboard/quality-summary", {
        params: {
          client_id: clientId,
          date_from: fromDate,   // ✅ your API expects DATE not datetime
          date_to: toDate
        }
      });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 15000
  });




export const useRecalculateSummary = (clientId: number | null,fromDate: string,toDate: string) =>
  useQuery({
    queryKey: ["recalculate-summary", clientId, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get("/sale-dashboard/recalculate-summary", {
        params: {
          client_id: clientId,
          date_from: fromDate,
          date_to: toDate
        }
      });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 20000
  });


type Section = {
  score: number;
  total_possible: number;
  parameter_count: number;
  percentage: number;
};

type AgentSummary = {
  total_calls: number;
  sections: Record<string, Section>;
  total_score: number;
  total_possible: number;
  conversion: number;
  partial: number;
  no_conversion: number;
  avg_score: number;
  percentage: number;
  conversion_pct: number;
  partial_pct: number;
  no_conversion_pct: number;
  strength: string;
  gap: string;
};

export const useAgentRecalculateSummary = (
  clientId: number | null,
  fromDate: string,
  toDate: string
) =>
  useQuery({
    queryKey: ["agent-recalculate-summary", clientId, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get<Record<string, AgentSummary>>(
        "/sale-dashboard/agent-recalculate-summary",
        {
          params: {
            client_id: clientId,
            date_from: fromDate,
            date_to: toDate
          }
        }
      );

      return Object.entries(data).map(([agentId, value]) => ({
        agentId,
        totalCalls: value.total_calls,
        score: value.avg_score,
        conversion: value.conversion_pct,
        partial: value.partial_pct,
        noConv: value.no_conversion_pct,

        // 🔥 formatted for UI
        strength: value.strength
          .replace("_", " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),

        gap: value.gap
          .replace("_", " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),

        sections: value.sections
      }));
    },
    enabled: !!clientId,
    refetchInterval: 20000
  });