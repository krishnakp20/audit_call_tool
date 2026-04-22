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

type Row = {
  id: string;
  agent: string;
  flag: string;
  score: number;
  impact: string;
  note: string;
};

/* ================= STATIC DATA ================= */

const TOP_CARDS = [
  {
    title: "Critical fails",
    value: 31,
    note: "Score below 50%",
    color: "text-red-600"
  },
  {
    title: "Wrong info flagged",
    value: 34,
    note: "Score zeroed on param",
    color: "text-red-600"
  },
  {
    title: "Rude / unprofessional",
    value: 6,
    note: "Full call score zeroed",
    color: "text-red-600"
  },
  {
    title: "Repeat complaint risk",
    value: 44,
    note: "Likely callback calls",
    color: "text-orange-600"
  }
];

const ROWS: Row[] = [
  {
    id: "CS-2040",
    agent: "Rakesh V.",
    flag: "Wrong info",
    score: 44,
    impact: "Param zeroed",
    note: "Told customer refund in 1hr — not guaranteed"
  },
  {
    id: "CS-2034",
    agent: "Amit K.",
    flag: "No resolution",
    score: 48,
    impact: "-14 pts",
    note: "Call ended before issue confirmed resolved"
  },
  {
    id: "CS-2029",
    agent: "Rakesh V.",
    flag: "Rude tone",
    score: 0,
    impact: "Full zero",
    note: "Professional language parameter triggered"
  },
  {
    id: "CS-2021",
    agent: "Priya M.",
    flag: "Premature solve",
    score: 56,
    impact: "-6 pts",
    note: "Solution before probing complete"
  },
  {
    id: "CS-2018",
    agent: "Rakesh V.",
    flag: "No closing",
    score: 41,
    impact: "-12 pts",
    note: "No summary, confirmation, or goodbye"
  }
];

/* ================= HELPERS ================= */

const getFlagStyle = (flag: string) => {
  if (flag.includes("Wrong") || flag.includes("Rude"))
    return "bg-red-100 text-red-700";
  if (flag.includes("No"))
    return "bg-red-100 text-red-600";
  return "bg-orange-100 text-orange-700";
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
};

/* ================= COMPONENT ================= */

export default function RedFlagsPage() {
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

      <h1 className="text-xl font-semibold">Red flags</h1>

      {/* ================= FILTERS ================= */}
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
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border h-9 px-2 rounded"/>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border h-9 px-2 rounded"/>
          </>
        )}
      </div>

      {/* ================= TOP CARDS ================= */}
      <div className="grid grid-cols-4 gap-4">
        {TOP_CARDS.map((c, i) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <div className="text-sm text-gray-500 uppercase">{c.title}</div>
            <div className={`text-2xl font-semibold ${c.color}`}>
              {c.value}
            </div>
            <div className="text-sm text-gray-500">{c.note}</div>
          </div>
        ))}
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white border rounded-xl p-5">

        <h2 className="font-semibold mb-4">Red flag call log</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Call ID</th>
                <th className="text-left">Agent</th>
                <th>Flag</th>
                <th>Score</th>
                <th>Impact</th>
                <th className="text-left">What happened</th>
              </tr>
            </thead>

            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} className="border-b text-center">

                  <td className="text-left py-2">{r.id}</td>
                  <td className="text-left">{r.agent}</td>

                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getFlagStyle(r.flag)}`}>
                      {r.flag}
                    </span>
                  </td>

                  <td className={getScoreColor(r.score)}>
                    {r.score}%
                  </td>

                  <td className="text-red-600">{r.impact}</td>

                  <td className="text-left text-gray-600">
                    {r.note}
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

    </div>
  );
}