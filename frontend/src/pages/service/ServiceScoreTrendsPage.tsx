import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

/* ================= TYPES ================= */

type Client = {
  id: number;
  name: string;
};

type TrendItem = {
  date: string;
  score: number;
  fcr: number;
  critical: number;
};

type ApiResponse = {
  trend?: TrendItem[];
  agents?: any[];
};

/* ================= HELPERS ================= */

const safe = (v: any) =>
  v === null || v === undefined || isNaN(v) ? 0 : Number(v);

/* ================= COMPONENT ================= */

export default function ServiceScoreTrendsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);

  const [fromDate, setFromDate] = useState(
    today.toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(
    today.toISOString().slice(0, 10)
  );
  const [dateFilter, setDateFilter] = useState("Today");

  /* ================= CLIENT ================= */

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clientId, clients]);

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

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["service-trends", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/score-trends?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ================= SAFE DATA ================= */

  const trendData =
    data?.trend?.map((d) => ({
      day: new Date(d.date).toLocaleDateString("en-IN", {
        weekday: "short"
      }),
      score: safe(d.score),
      fcr: safe(d.fcr),
      critical: safe(d.critical)
    })) || [];

  const agentTrend = data?.agents || [];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Score Trends</h1>

      {/* FILTER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
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
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </>
        )}
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* NO DATA */}
      {!isLoading && trendData.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          No data available
        </div>
      )}

      {/* CHARTS */}
      {trendData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 1️⃣ QA SCORE */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="mb-2 text-sm font-medium">
              Overall QA Score — Daily
            </h2>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="score" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 2️⃣ AGENT TREND */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="mb-2 text-sm font-medium">
              Agent Trend — Weekly
            </h2>

            {agentTrend.length === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={agentTrend}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  {Object.keys(agentTrend[0] || {})
                    .filter((k) => k !== "week")
                    .map((key) => (
                      <Line key={key} dataKey={key} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 3️⃣ FCR */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="mb-2 text-sm font-medium">
              FCR Trend — Daily
            </h2>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="fcr" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 4️⃣ CRITICAL */}
          <div className="bg-white border rounded-xl p-4">
            <h2 className="mb-2 text-sm font-medium">
              Critical Fails
            </h2>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="critical" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

    </div>
  );
}