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

type Priority = {
  rank: number;
  title: string;
  desc: string;
  tags: string[];
};

/* ================= STATIC DATA ================= */

const PRIORITIES: Priority[] = [
  {
    rank: 1,
    title: "Closing framework — entire team",
    desc:
      "52% calls missing closing. Script: summarize → confirm resolved → offer further help → brand goodbye.",
    tags: ["All agents", "This week"]
  },
  {
    rank: 2,
    title: "Probing before solving — Rakesh, Priya",
    desc:
      "Minimum 2 questions before solution. Ask: issue type → since when → what error → attempts made.",
    tags: ["Rakesh V.", "Priya M."]
  },
  {
    rank: 3,
    title: "Hold procedure SOP — Amit, Rakesh",
    desc:
      "Ask permission → state reason → thank on return. Currently skipped in 31% of calls.",
    tags: ["Amit K.", "Rakesh V."]
  },
  {
    rank: 4,
    title: "Call control and ownership — Amit, Rakesh",
    desc:
      "Agents going passive. Rule: after every customer input, ask next-step question or confirm understanding.",
    tags: ["Amit K.", "Rakesh V."]
  },
  {
    rank: 5,
    title: "Issue restatement — Neha, Priya",
    desc:
      "Not restating issue before solving. Repeat issue → confirm → then solve.",
    tags: ["Neha T.", "Priya M."]
  }
];

/* ================= HELPERS ================= */

const getRankColor = (rank: number) => {
  if (rank === 1) return "bg-red-100 text-red-700";
  if (rank === 2) return "bg-red-50 text-red-600";
  if (rank === 3) return "bg-orange-100 text-orange-700";
  if (rank === 4) return "bg-orange-50 text-orange-600";
  return "bg-green-100 text-green-700";
};

/* ================= COMPONENT ================= */

export default function TrainingPrioritiesPage() {
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

    if (dateFilter === "Last 7 Days") {
      from.setDate(today.getDate() - 6);
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(today.getDate() - 29);
    }

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(today));
    }
  }, [dateFilter]);

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Training needs</h1>

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

      {/* ================= PRIORITIES ================= */}

      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold">
          Team training priorities — ranked by impact
        </h2>

        {PRIORITIES.map((p) => (
          <div
            key={p.rank}
            className="flex gap-4 border-b pb-4 last:border-none"
          >

            {/* RANK */}
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${getRankColor(p.rank)}`}
            >
              {p.rank}
            </div>

            {/* CONTENT */}
            <div className="flex-1 space-y-1">

              <div className="font-medium">{p.title}</div>

              <div className="text-sm text-gray-600">
                {p.desc}
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {p.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}