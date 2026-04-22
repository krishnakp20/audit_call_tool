import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

type Client = {
  id: number;
  name: string;
};

type AgentCard = {
  name: string;
  initials: string;
  calls: number;
  score: number;
  tag: string;
  metrics: { label: string; value: number }[];
  issues?: string[];
  training: string;
};

type ApiResponse = {
  agents: AgentCard[];
};

const getColor = (v: number) => {
  if (v >= 80) return "bg-green-500";
  if (v >= 60) return "bg-orange-500";
  return "bg-red-500";
};

const getTagColor = (tag: string) => {
  if (tag === "Good") return "bg-green-100 text-green-700";
  if (tag === "Average") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
};

export default function WeeklyReportPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  /* CLIENT */
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  /* DATE */
  useEffect(() => {
    const today = new Date();
    let from = new Date();

    if (dateFilter === "Last 7 Days") from.setDate(today.getDate() - 6);
    if (dateFilter === "Last 30 Days") from.setDate(today.getDate() - 29);

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(today));
    }
  }, [dateFilter]);

  /* API */
  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["weekly-report", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/weekly-report?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const agents = data?.agents || [];

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Weekly report</h1>

      {/* FILTER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="border h-9 px-2 rounded"
        >
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border h-9 px-2 rounded"
        >
          <option>Today</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border h-9 px-2 rounded"/>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border h-9 px-2 rounded"/>
          </>
        )}
      </div>

      {isLoading && <div className="text-center py-10">Loading...</div>}

      {/* AGENTS */}
      <div className="space-y-4">

        {agents.map((a, i) => (
          <div key={i} className="bg-white border rounded-xl p-5 space-y-4">

            <div className="flex justify-between">

              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {a.initials}
                </div>

                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-gray-500">
                    {a.calls} calls
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-xl font-semibold ${
                  a.score < 50 ? "text-red-600" : "text-green-600"
                }`}>
                  {a.score}%
                </div>

                <span className={`text-xs px-2 py-1 rounded ${getTagColor(a.tag)}`}>
                  {a.tag}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">

              {/* METRICS */}
              <div className="space-y-2">
                {a.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{m.label}</div>
                    <div className="flex-1 bg-gray-200 h-2 rounded">
                      <div
                        className={`h-2 rounded ${getColor(m.value)}`}
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                    <div className="w-10 text-sm text-right">
                      {m.value}%
                    </div>
                  </div>
                ))}
              </div>

              {/* ISSUES */}
              <div className="space-y-3">

                {a.issues?.map((i, idx) => (
                  <div key={idx} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                    {i}
                  </div>
                ))}

                <div>
                  <h4 className="text-xs text-gray-500 uppercase">
                    Training assigned
                  </h4>

                  <div className="text-sm text-gray-700">
                    {a.training}
                  </div>
                </div>

              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}