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

type AgentCard = {
  name: string;
  initials: string;
  calls: number;
  score: number;
  tag: "Critical" | "Average" | "Good";
  metrics: { label: string; value: number }[];
  issues?: string[];
  focus?: string;
  training: string;
};

/* ================= STATIC DATA ================= */

const AGENTS: AgentCard[] = [
  {
    name: "Rakesh V.",
    initials: "RV",
    calls: 44,
    score: 49,
    tag: "Critical",
    metrics: [
      { label: "Opening", value: 68 },
      { label: "Understanding", value: 41 },
      { label: "Resolution", value: 38 },
      { label: "Closing", value: 29 }
    ],
    issues: [
      "No probing — 78% of calls",
      "No closing summary — 81%",
      "Premature solution — 62%"
    ],
    training: "Closing framework + Probing drill — Week 1 & 2"
  },
  {
    name: "Rahul S.",
    initials: "RS",
    calls: 42,
    score: 81,
    tag: "Good",
    metrics: [
      { label: "Opening", value: 84 },
      { label: "Understanding", value: 79 },
      { label: "Resolution", value: 82 },
      { label: "Closing", value: 55 }
    ],
    focus: "Closing — resolution summary missing 42%",
    training: "Closing framework — Week 1 (team-wide)"
  }
];

/* ================= HELPERS ================= */

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

/* ================= COMPONENT ================= */

export default function WeeklyReportPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

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
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(today.getDate() - 29);
    }

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Weekly report</h1>

      {/* FILTERS */}
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

      {/* WEEK HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Week of 7 Apr 2026</h2>

        <button className="border px-3 py-1 rounded text-sm">
          Generate full report ↗
        </button>
      </div>

      {/* AGENT CARDS */}
      <div className="space-y-4">

        {AGENTS.map((a, i) => (
          <div key={i} className="bg-white border rounded-xl p-5 space-y-4">

            {/* HEADER */}
            <div className="flex justify-between items-center">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-medium">
                  {a.initials}
                </div>

                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-gray-500">
                    {a.calls} calls • Week of 7 Apr
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

            {/* BODY */}
            <div className="grid grid-cols-2 gap-6">

              {/* LEFT - METRICS */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-500 uppercase">
                  Parameter scores
                </h4>

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

              {/* RIGHT */}
              <div className="space-y-3">

                {a.issues && (
                  <>
                    <h4 className="text-xs text-gray-500 uppercase">
                      Recurring failures
                    </h4>

                    {a.issues.map((i, idx) => (
                      <div
                        key={idx}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm"
                      >
                        {i}
                      </div>
                    ))}
                  </>
                )}

                {a.focus && (
                  <>
                    <h4 className="text-xs text-gray-500 uppercase">
                      Focus area
                    </h4>

                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                      {a.focus}
                    </div>
                  </>
                )}

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