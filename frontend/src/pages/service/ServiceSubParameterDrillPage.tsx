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

/* ================= STATIC DATA ================= */

const SUB_PARAMS: SubParam[] = [
  { label: "Greeting presence", value: 88 },
  { label: "Company identification", value: 86 },
  { label: "Agent identification", value: 71 },
  { label: "Offer of help", value: 68 },
  { label: "Opening clarity and flow", value: 74 },
  { label: "Late opening", value: 79, late: 21 },
  { label: "Voice energy", value: 58 }
];

const AGENT_ROWS: AgentRow[] = [
  {
    name: "Rahul S.",
    greeting: 95,
    company: 92,
    agent: 88,
    help: 82,
    clarity: 85,
    late: 90,
    voice: 78
  },
  {
    name: "Neha T.",
    greeting: 98,
    company: 94,
    agent: 72,
    help: 80,
    clarity: 88,
    late: 91,
    voice: 64
  },
  {
    name: "Amit K.",
    greeting: 84,
    company: 88,
    agent: 68,
    help: 65,
    clarity: 70,
    late: 74,
    voice: 55
  },
  {
    name: "Priya M.",
    greeting: 82,
    company: 74,
    agent: 65,
    help: 60,
    clarity: 66,
    late: 70,
    voice: 44
  },
  {
    name: "Rakesh V.",
    greeting: 74,
    company: 68,
    agent: 48,
    help: 44,
    clarity: 42,
    late: 62,
    voice: 38
  }
];

const AGENTS = ["Rahul S.", "Neha T.", "Amit K.", "Priya M.", "Rakesh V."];

/* ================= COMPONENT ================= */

export default function SubParameterDrillPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);

  /* ================= CLIENT API ================= */

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  /* ================= DATE FILTER ================= */

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
      to = today;
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(today.getDate() - 29);
      to = today;
    }

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= HELPERS ================= */

  const getColor = (v: number) => {
    if (v >= 80) return "bg-green-500";
    if (v >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Sub-parameter drill</h1>

      {/* ================= FILTER HEADER ================= */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">

        {/* Client */}
        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="border h-9 px-2 rounded min-w-[160px]"
        >
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Date */}
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

        {/* Agent */}
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="border h-9 px-2 rounded"
        >
          {AGENTS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>

      </div>

      {/* ================= OPENING SECTION ================= */}
      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold">Opening (14 pts)</h2>

        {/* Sub params */}
        <div className="space-y-3">
          {SUB_PARAMS.map((p, i) => (
            <div key={i} className="flex items-center gap-3">

              <div className="w-56 text-sm">{p.label}</div>

              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className={`h-2 rounded ${getColor(p.value)}`}
                  style={{ width: `${p.value}%` }}
                />
              </div>

              <div className="w-16 text-sm text-right">
                {p.value}%
                {p.late && (
                  <span className="text-red-500 text-xs ml-1">
                    {p.late}% late
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white border rounded-xl p-5">

        <h3 className="font-medium mb-3">
          Opening — by agent (sub-parameter view)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Agent</th>
                <th>Greeting</th>
                <th>Company ID</th>
                <th>Agent Name</th>
                <th>Help Offer</th>
                <th>Clarity</th>
                <th>Late Open</th>
                <th>Voice</th>
              </tr>
            </thead>

            <tbody>
              {AGENT_ROWS.map((a, i) => (
                <tr key={i} className="border-b text-center">

                  <td className="text-left py-2">{a.name}</td>

                  <td className="text-green-600">{a.greeting}%</td>
                  <td className="text-green-600">{a.company}%</td>
                  <td className="text-orange-600">{a.agent}%</td>
                  <td className="text-orange-600">{a.help}%</td>
                  <td className="text-orange-600">{a.clarity}%</td>
                  <td className="text-orange-600">{a.late}%</td>
                  <td className="text-red-600">{a.voice}%</td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

    </div>
  );
}