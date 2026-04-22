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

type SubParam = {
  label: string;
  value: number;
  late?: number;
};

type AgentRow = {
  name: string;
  greeting: number;
  company: number;
  agent: number;
  help: number;
  clarity: number;
  late: number;
  voice: number;
};

type ApiResponse = {
  sub_params: SubParam[];
  agents: AgentRow[];
  agent_list: string[];
};

/* ================= HELPERS ================= */

const safe = (v: any) =>
  v === null || v === undefined || isNaN(v) ? 0 : v;

const getColor = (v: number) => {
  if (v >= 80) return "bg-green-500";
  if (v >= 60) return "bg-orange-500";
  return "bg-red-500";
};

/* ================= COMPONENT ================= */

export default function SubParameterDrillPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);

  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [selectedAgent, setSelectedAgent] = useState("");

  /* ================= CLIENT ================= */

  const { data: clients, isLoading: clientLoading } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  /* ✅ AUTO SELECT CLIENT */
  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  /* ================= DATE FIX ================= */

  useEffect(() => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    if (dateFilter === "Today") {
      from = today;
      to = today;
    }

    if (dateFilter === "Last 7 Days") {
      from.setDate(today.getDate() - 6);
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(today.getDate() - 29);
    }

    // ✅ IMPORTANT: don't override custom range
    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["sub-param", clientId, fromDate, toDate, selectedAgent],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/sub-parameter-drill?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}&agent=${selectedAgent}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ✅ AUTO SELECT AGENT */
  useEffect(() => {
    if (data?.agent_list?.length && !selectedAgent) {
      setSelectedAgent(data.agent_list[0]);
    }
  }, [data, selectedAgent]);

  const subParams = data?.sub_params || [];
  const agentRows = data?.agents || [];
  const agents = data?.agent_list || [];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Sub-parameter drill</h1>

      {/* ================= HEADER ================= */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">

        {/* CLIENT */}
        <select
          value={clientId ?? ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="border h-9 px-2 rounded"
        >
          {!clientId && <option value="">Select Client</option>}
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* DATE FILTER */}
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

        {/* ✅ CUSTOM DATE INPUT */}
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

        {/* AGENT */}
        <select
          value={selectedAgent || ""}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="border h-9 px-2 rounded"
        >
          {agents.length === 0 && <option value="">No agents</option>}
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

      </div>

      {/* ================= LOADING ================= */}
      {(isLoading || clientLoading) && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* ================= SUB PARAMS ================= */}
      {!isLoading && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Opening</h2>

          {subParams.map((p, i) => (
            <div key={i} className="flex items-center gap-3">

              <div className="w-56 text-sm">{p.label}</div>

              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className={`h-2 rounded ${getColor(safe(p.value))}`}
                  style={{ width: `${safe(p.value)}%` }}
                />
              </div>

              <div className="w-16 text-sm text-right">
                {safe(p.value)}%
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ================= TABLE ================= */}
      {!isLoading && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="mb-3">Agent view</h3>

          <table className="w-full text-sm text-center">

            <thead className="border-b">
              <tr>
                <th className="text-left">Agent</th>
                <th>Greeting</th>
                <th>Company</th>
                <th>Agent</th>
                <th>Help</th>
                <th>Clarity</th>
                <th>Late</th>
                <th>Voice</th>
              </tr>
            </thead>

            <tbody>
              {agentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-gray-400">
                    No data
                  </td>
                </tr>
              ) : (
                agentRows.map((a, i) => (
                  <tr key={i} className="border-b">
                    <td className="text-left">{a.name}</td>
                    <td>{safe(a.greeting)}%</td>
                    <td>{safe(a.company)}%</td>
                    <td>{safe(a.agent)}%</td>
                    <td>{safe(a.help)}%</td>
                    <td>{safe(a.clarity)}%</td>
                    <td>{safe(a.late)}%</td>
                    <td>{safe(a.voice)}%</td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      )}

    </div>
  );
}