import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { StatCard } from "@/components/StatCard";
import { ChartCard } from "@/components/ChartCard";
import { Skeleton } from "@/components/Skeleton";
import toast from "react-hot-toast";
import { useAgentPerformance, useDashboardSummary } from "@/hooks/useDashboardData";
import { Client } from "@/types";

export default function DashboardPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

  const summary = useDashboardSummary(clientId, fromDate, toDate);
  const agentPerformance = useAgentPerformance(clientId, fromDate, toDate);

  if (clientsQuery.isLoading || summary.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const trendData =
    agentPerformance.data?.map((item: { agent_id: string; avg_score: number }, idx: number) => ({
      name: `W${idx + 1}`,
      score: item.avg_score
    })) ?? [];

  const heatMapData =
    agentPerformance.data?.map((item: { agent_id: string; avg_score: number }) => ({
      agent: item.agent_id,
      failures: Math.max(0, 100 - item.avg_score)
    })) ?? [];

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <div className="flex min-w-[220px] flex-col">
          <label className="mb-1 text-xs font-medium text-slate-600">Client</label>
          <select
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
            value={clientId ?? ""}
            onChange={(e) => setClientId(Number(e.target.value))}
          >
            {clientsQuery.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[170px] flex-col">
          <label className="mb-1 text-xs font-medium text-slate-600">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex min-w-[170px] flex-col">
          <label className="mb-1 text-xs font-medium text-slate-600">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
          />
        </div>
        <button
          className="ml-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs"
          onClick={async () => {
            if (!clientId) return;
            const response = await api.get("/export", {
              params: {
                client_id: clientId,
                from: `${fromDate}T00:00:00`,
                to: `${toDate}T23:59:59`
              },
              responseType: "blob"
            });
            const url = URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit_export.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Export downloaded");
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Calls" value={summary.data?.total_calls ?? 0} />
        <StatCard title="Audited Calls" value={summary.data?.audited_calls ?? 0} accent="from-violet-500 to-fuchsia-500" />
        <StatCard
          title="Avg Score"
          value={Number(summary.data?.avg_score ?? 0).toFixed(2)}
          accent="from-emerald-500 to-cyan-500"
        />
        <StatCard title="Fatal Calls" value={summary.data?.fatal_calls ?? 0} accent="from-rose-500 to-orange-500" />
      </div>

      {(summary.data?.audited_calls ?? 0) === 0 && (
        <div className="glass-card p-3 text-xs text-amber-700">
          No audited calls found for selected date range. Avg Score is shown as 0.00.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Score Trend">
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Agent Performance">
          <ResponsiveContainer>
            <BarChart data={agentPerformance.data ?? []}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="agent_id" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Parameter Failure Heatmap (proxy)">
        <ResponsiveContainer>
          <BarChart data={heatMapData}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="agent" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="failures" fill="#fb7185" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
