import React, { useEffect, useMemo, useState } from "react";
import DashboardTabs from "@/components/DashboardTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { departmentStorage } from "@/services/department";
const department =
  departmentStorage.get();

/* ================= TYPES ================= */

type Client = {
  id: number;
  name: string;
};

type SummaryItem = {
  title: string;
  value: number | string;
  desc: string;
};

type LogItem = {
  call: string;
  agent: string;
  flag: string;
  impact: number | string;
  score: number;
  outcome: string;
};

type CapItem = {
  title: string;
  desc: string;
};

type CriticalFlagsResponse = {
  summary: SummaryItem[];
  logs: LogItem[];
  caps: CapItem[];
};

/* ================= COMPONENT ================= */

export default function CriticalFlagsPage() {

  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const todayDate = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
  const fromDate = useUIStore((s) => s.fromDate);
  const toDate = useUIStore((s) => s.toDate);
  const dateFilter = useUIStore((s) => s.dateFilter);

  const setFromDate = useUIStore((s) => s.setFromDate);
  const setToDate = useUIStore((s) => s.setToDate);
  const setDateFilter = useUIStore((s) => s.setDateFilter);

  /* ================= CLIENTS ================= */

const clientsQuery = useQuery<Client[]>({
   queryKey: ["clients", department],

      queryFn: async () =>
        (
          await api.get<Client[]>(
            `/clients?department=${department}`
          )
        ).data
    });

  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

  /* ================= DATE LOGIC ================= */

  useEffect(() => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    if (dateFilter === "Today") {
      from = today;
      to = today;
    }
    if (dateFilter === "Yesterday") {
      from = new Date();
      from.setDate(today.getDate() - 1);
      to = from;
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
      const f = (d: Date): string =>
        d.toISOString().slice(0,10);

      setFromDate(f(from));
      setToDate(f(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data } = useQuery<CriticalFlagsResponse>({
    queryKey: ["critical-flags", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/critical-flags?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const summary: SummaryItem[] = data?.summary || [];
  const logs: LogItem[] = data?.logs || [];
  const caps: CapItem[] = data?.caps || [];

  /* ================= HELPERS ================= */

  const getOutcomeColor = (outcome: string): string => {
    if (outcome === "Not Converted") return "bg-red-100 text-red-600";
    if (outcome === "Partially Converted") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Critical Flags</h1>
        <p className="text-sm text-gray-500">
          Key failure patterns impacting conversions
        </p>
      </div>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId ?? ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="h-9 border px-2 rounded"
        >
          {clientsQuery.data?.map((c: Client) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 border px-2 rounded"
        >
          <option>Today</option>
          <option>Yesterday</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input
              type="date"
              value={fromDate}
              max={todayDate}
              onChange={(e) => {
                setFromDate(e.target.value);

                if (toDate < e.target.value) {
                  setToDate(e.target.value);
                }
              }}
              className="border h-9 px-2 rounded"
            />

            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={todayDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border h-9 px-2 rounded"
            />
          </>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid md:grid-cols-4 gap-4">
        {summary.map((item: SummaryItem, i: number) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">
              {item.title}
            </p>
            <p className="text-2xl font-bold text-red-600">
              {item.value}
            </p>
            <p className="text-sm text-gray-500">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-x-auto">

        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Critical flags — call log
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left">Call</th>
              <th className="p-2 text-left">Agent</th>
              <th className="p-2">Flag</th>
              <th className="p-2">Impact</th>
              <th className="p-2">Score</th>
              <th className="p-2">Outcome</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((row: LogItem, i: number) => (
              <tr key={i} className="border-b text-center">

                <td className="p-2 text-left">{row.call}</td>
                <td className="p-2 text-left">{row.agent}</td>

                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      row.flag === "Good Call"
                        ? "bg-green-100 text-green-700"
                        : row.flag === "Average Call"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {row.flag}
                  </span>
                </td>

                <td className="text-red-500">{row.impact}</td>
                <td>{row.score}</td>

                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded ${getOutcomeColor(row.outcome)}`}
                  >
                    {row.outcome}
                  </span>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CAPS */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Score cap tracker</h2>

        {caps.map((c: CapItem, i: number) => (
          <div key={i} className="flex gap-2">
            <span className="text-red-500">●</span>
            <div>
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-sm text-gray-600">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

