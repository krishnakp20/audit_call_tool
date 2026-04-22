import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

/* ================= TYPES ================= */

type Client = {
  id: number;
  name: string;
};

type AgentScore = {
  name: string;
  tag: "Critical" | "Average" | "Good";
  avg: number;
  fcr: number;
  metrics: {
    label: string;
    value: number;
  }[];
  issue: string;
};

/* ================= HELPERS ================= */

const safe = (v: any) =>
  v === null || v === undefined || isNaN(v) ? 0 : v;

/* ================= COMPONENT ================= */

export default function AgentScorecardPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);

  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  /* ✅ FIX: use index instead of name */
  const [selectedIndex, setSelectedIndex] = useState(0);

  /* ================= CLIENT API ================= */

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId, setClientId]);

  /* ================= DATE ================= */

  useEffect(() => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    if (dateFilter === "Last 7 Days") from.setDate(today.getDate() - 6);
    if (dateFilter === "Last 30 Days") from.setDate(today.getDate() - 29);

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data, isLoading } = useQuery({
    queryKey: ["agent-scorecard", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/agent-scorecard?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const agents: AgentScore[] = data?.agents || [];

  /* ✅ RESET INDEX WHEN DATA CHANGES */
  useEffect(() => {
    if (agents.length > 0) {
      setSelectedIndex(0);
    }
  }, [agents]);

  /* ✅ SELECTED AGENT */
  const agent = agents[selectedIndex];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Agent Scorecard</h1>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">

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
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border h-9 px-2 rounded"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border h-9 px-2 rounded"
            />
          </>
        )}
      </div>

      {/* AGENT SELECT */}
      <div className="bg-white border rounded-xl p-4">
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full border h-10 px-3 rounded"
        >
          {agents.map((a, i) => (
            <option key={i} value={i}>
              {a.name} — {a.tag}
            </option>
          ))}
        </select>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* NO DATA */}
      {!isLoading && agents.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          No data available
        </div>
      )}

      {/* CARD */}
      {agent && (
        <div className="bg-white border rounded-xl p-5 space-y-4">

          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">{agent.name}</h2>

            <span className={`px-2 py-1 text-xs rounded ${
              agent.tag === "Good"
                ? "bg-green-100 text-green-700"
                : agent.tag === "Average"
                ? "bg-orange-100 text-orange-600"
                : "bg-red-100 text-red-600"
            }`}>
              {agent.tag}
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Avg {safe(agent.avg)}% • FCR {safe(agent.fcr)}%
          </p>

          {/* METRICS */}
          <div className="space-y-3">
            {agent.metrics.map((m, i) => (
              <div key={i} className="flex items-center gap-3">

                <div className="w-40 text-sm">{m.label}</div>

                <div className="flex-1 bg-gray-200 h-2 rounded">
                  <div
                    className={`h-2 rounded ${
                      m.value >= 70
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${safe(m.value)}%` }}
                  />
                </div>

                <div className="w-10 text-sm text-right">
                  {safe(m.value)}%
                </div>

              </div>
            ))}
          </div>

          {/* ISSUE */}
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded">
            {agent.issue}
          </div>

        </div>
      )}

    </div>
  );
}