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

/* ================= STATIC DATA ================= */

const TOP_CARDS = [
  {
    title: "Closing failure rate",
    value: 52,
    note: "No resolution summary",
    color: "text-red-600"
  },
  {
    title: "Premature solution rate",
    value: 38,
    note: "Solution before probing",
    color: "text-orange-600"
  },
  {
    title: "Customer repeat rate",
    value: 27,
    note: "Customer re-explained issue",
    color: "text-orange-600"
  },
  {
    title: "Hold SOP failure",
    value: 31,
    note: "Hold without reason given",
    color: "text-orange-600"
  }
];

const FAILURES = [
  {
    title: "No closing summary — 52% of calls",
    desc: "Biggest team-wide gap. Customer left without knowing what was resolved.",
    color: "bg-red-500"
  },
  {
    title: "No resolution confirmation — 48% of calls",
    desc: "Agent ends call without asking if issue is fixed.",
    color: "bg-red-500"
  },
  {
    title: "Solution before probing — 38% of calls",
    desc: "Direct FCR impact — assumption-led resolution.",
    color: "bg-orange-500"
  },
  {
    title: "Hold without reason — 31% of calls",
    desc: "SOP step missed. Customer left uncertain.",
    color: "bg-orange-500"
  },
  {
    title: "Customer re-explained issue — 27% of calls",
    desc: "Probing failure signal. Agent didn’t understand first time.",
    color: "bg-orange-500"
  },
  {
    title: "Brand name in opening — 86% compliance",
    desc: "Relatively strong. Strengthen to 95%+.",
    color: "bg-green-500"
  }
];

const FCR = [
  { label: "FCR achieved", value: 72, color: "bg-green-600" },
  { label: "Partial resolution", value: 18, color: "bg-orange-500" },
  { label: "Not resolved", value: 10, color: "bg-red-500" }
];

const DRIVERS = [
  "Premature solution (no probing)",
  "Wrong info given to customer",
  "Incomplete resolution steps",
  "No follow-through on backend action"
];

/* ================= COMPONENT ================= */

export default function ProcessInsightsPage() {
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

      <h1 className="text-xl font-semibold">Process insights</h1>

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
              {c.value}%
            </div>
            <div className="text-sm text-gray-500">{c.note}</div>
          </div>
        ))}
      </div>

      {/* ================= MAIN GRID ================= */}
      <div className="grid grid-cols-2 gap-5">

        {/* LEFT */}
        <div className="bg-white border rounded-xl p-5 space-y-4">

          <h2 className="font-semibold">Ranked process failures</h2>

          {FAILURES.map((f, i) => (
            <div key={i} className="flex gap-3 border-b pb-3">

              <div className={`w-3 h-3 mt-2 rounded-full ${f.color}`} />

              <div>
                <div className="font-medium">{f.title}</div>
                <div className="text-sm text-gray-600">{f.desc}</div>
              </div>

            </div>
          ))}

        </div>

        {/* RIGHT */}
        <div className="bg-white border rounded-xl p-5 space-y-5">

          <h2 className="font-semibold">FCR breakdown</h2>

          {FCR.map((f, i) => (
            <div key={i} className="flex items-center gap-3">

              <div className="w-40 text-sm">{f.label}</div>

              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className={`${f.color} h-2 rounded`}
                  style={{ width: `${f.value}%` }}
                />
              </div>

              <div className="w-10 text-sm text-right">
                {f.value}%
              </div>

            </div>
          ))}

          <hr />

          <div>
            <h3 className="text-sm font-medium mb-2">
              Top FCR failure drivers
            </h3>

            <div className="flex flex-wrap gap-2">
              {DRIVERS.map((d, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-700"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}