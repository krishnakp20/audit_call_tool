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
      const { data } = await api.get<any[]>(
        "/sale-dashboard/agent-recalculate-summary",
        {
          params: {
            client_id: clientId,
            date_from: fromDate,
            date_to: toDate
          }
        }
      );

      // ✅ FIX: data is already array
      return data.map((agent) => ({
        agentId: agent.agentId,
        totalCalls: agent.totalCalls,
        score: agent.score,
        conversion: agent.conversion,
        partial: agent.partial,
        noConv: agent.noConv,

        strength: agent.strength
          ?.replace("_", " ")
          ?.replace(/\b\w/g, (c: string) => c.toUpperCase()),

        gap: agent.gap
          ?.replace("_", " ")
          ?.replace(/\b\w/g, (c: string) => c.toUpperCase()),

        sections: agent.sections
      }));
    },
    enabled: !!clientId,
    refetchInterval: 20000
  });