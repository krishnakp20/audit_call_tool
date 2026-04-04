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
