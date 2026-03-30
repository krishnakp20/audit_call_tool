import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const useDashboardSummary = (clientId: number | null) =>
  useQuery({
    queryKey: ["dashboard-summary", clientId],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/summary", { params: { client_id: clientId } });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 15000
  });

export const useAgentPerformance = (clientId: number | null) =>
  useQuery({
    queryKey: ["agent-performance", clientId],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/agent-performance", { params: { client_id: clientId } });
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 20000
  });
