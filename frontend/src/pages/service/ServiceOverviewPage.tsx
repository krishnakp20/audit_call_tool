import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
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

type ApiResponse = {
  cards?: {
    calls_audited?: number;
    avg_score?: number;
    fcr_rate?: number;
    critical_fails?: number;
    unclear_rate?: number;
    late_opening?: number;
    wrong_info?: number;
    no_closing?: number;
  };
  parameter_scores?: Record<string, number>;
  agents?: {
    name: string;
    calls: number;
    avg_score: number;
    fcr: number;
    status: "Good" | "Average" | "Critical";
  }[];
};

/* ================= HELPERS ================= */

const safeNumber = (val: any) => {
  return val === null || val === undefined || isNaN(val) ? 0 : val;
};

const formatPercent = (val: any) => {
  return `${safeNumber(val)}%`;
};

const getBarColor = (val: number) => {
  if (val >= 80) return "bg-green-500";
  if (val >= 60) return "bg-orange-500";
  return "bg-red-500";
};

const normalizeScore = (val: number) => {
  return Math.min(100, (safeNumber(val) / 30) * 100);
};

/* ================= COMPONENT ================= */

export default function ServiceOverviewPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [dateFilter, setDateFilter] = useState("Today");

  /* ================= CLIENT API ================= */

const { data: clients } = useQuery({
  queryKey: ["clients", department],

  queryFn: async () =>
    (
      await api.get<Client[]>(
        `/clients?department=${department}`
      )
    ).data
});

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clientId, clients, setClientId]);

  /* ================= DATE LOGIC ================= */

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

  /* ================= MAIN API ================= */

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["service-overview", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/overview?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <div>
        <h1 className="text-xl font-semibold">Service Overview</h1>
        <p className="text-sm text-gray-500">
          Customer support performance dashboard
        </p>
      </div>

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

      {/* LOADING */}
      {isLoading && (
        <div className="text-center py-10 text-gray-500">
          Loading dashboard...
        </div>
      )}

      {/* CARDS */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <Card title="Calls Audited" value={safeNumber(data.cards?.calls_audited)} />
          <Card title="Avg Score" value={formatPercent(data.cards?.avg_score)} />
          <Card title="FCR Rate" value={formatPercent(data.cards?.fcr_rate)} />
          <Card title="Critical Fails" value={safeNumber(data.cards?.critical_fails)} />

          <Card title="Unclear Rate" value={formatPercent(data.cards?.unclear_rate)} />
          <Card title="Late Opening" value={formatPercent(data.cards?.late_opening)} />
          <Card title="Wrong Info" value={formatPercent(data.cards?.wrong_info)} />
          <Card title="No Closing" value={formatPercent(data.cards?.no_closing)} />

        </div>
      )}

      {/* LOWER */}
      {data && (
        <div className="grid md:grid-cols-2 gap-4">

          {/* PARAMETERS */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="font-medium mb-3">Score by parameter</h2>

            {Object.entries(data?.parameter_scores || {}).map(([name, val]) => {
              const percent = normalizeScore(val);

              return (
                <div key={name} className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{name}</span>
                    <span>{percent.toFixed(0)}%</span>
                  </div>

                  <div className="bg-gray-200 h-2 rounded">
                    <div
                      className={`h-2 rounded ${getBarColor(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AGENTS */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="font-medium mb-3">Agent leaderboard</h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th>Agent</th>
                  <th>Calls</th>
                  <th>Avg</th>
                  <th>FCR</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {(data?.agents || []).map((a, i) => (
                  <Row
                    key={i}
                    name={a.name}
                    calls={safeNumber(a.calls)}
                    avg={formatPercent(a.avg_score)}
                    fcr={formatPercent(a.fcr)}
                    status={a.status || "Average"}
                  />
                ))}
              </tbody>
            </table>

          </div>

        </div>
      )}

    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <h2 className="text-xl font-semibold">{value}</h2>
    </div>
  );
}

function Row({ name, calls, avg, fcr, status }: any) {

  const color =
    status === "Good"
      ? "bg-green-100 text-green-700"
      : status === "Average"
      ? "bg-orange-100 text-orange-600"
      : "bg-red-100 text-red-600";

  return (
    <tr className="border-b">
      <td>{name}</td>
      <td>{calls}</td>
      <td>{avg}</td>
      <td>{fcr}</td>
      <td>
        <span className={`px-2 py-1 rounded text-xs ${color}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}