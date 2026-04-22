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

type TrendData = {
  day: string;
  score: number;
  fcr: number;
  critical: number;
};

type AgentTrend = {
  week: string;
  Rahul: number;
  Neha: number;
  Amit: number;
  Priya: number;
  Rakesh: number;
};

/* ================= COMPONENT ================= */

export default function ServiceScoreTrendsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);

  const [fromDate, setFromDate] = useState<string>(
    today.toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(
    today.toISOString().slice(0, 10)
  );
  const [dateFilter, setDateFilter] = useState<string>("Today");

  /* ================= CLIENTS ================= */

  const clientsQuery = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
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

  /* ================= API ================= */

  const { data } = useQuery({
    queryKey: ["service-trends", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/score-trends?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ================= MOCK FALLBACK ================= */
  const trendData: TrendData[] =
    data?.trend ||
    [
      { day: "Mon", score: 65, fcr: 68, critical: 7 },
      { day: "Tue", score: 64, fcr: 69, critical: 8 },
      { day: "Wed", score: 67, fcr: 70, critical: 6 },
      { day: "Thu", score: 66, fcr: 69, critical: 7 },
      { day: "Fri", score: 68, fcr: 71, critical: 5 },
      { day: "Sat", score: 67, fcr: 70, critical: 6 },
      { day: "Sun", score: 67, fcr: 70, critical: 6 }
    ];

  const agentTrend: AgentTrend[] =
    data?.agents ||
    [
      { week: "W1", Rahul: 78, Neha: 74, Amit: 60, Priya: 58, Rakesh: 52 },
      { week: "W2", Rahul: 79, Neha: 75, Amit: 61, Priya: 59, Rakesh: 50 },
      { week: "W3", Rahul: 80, Neha: 76, Amit: 62, Priya: 60, Rakesh: 49 },
      { week: "W4", Rahul: 81, Neha: 77, Amit: 63, Priya: 61, Rakesh: 48 },
      { week: "W5", Rahul: 82, Neha: 78, Amit: 64, Priya: 61, Rakesh: 49 },
      { week: "W6", Rahul: 81, Neha: 77, Amit: 63, Priya: 60, Rakesh: 50 },
      { week: "W7", Rahul: 81, Neha: 78, Amit: 64, Priya: 61, Rakesh: 49 }
    ];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Score Trends</h1>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clientsQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option>Today</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* QA Score */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="mb-2 text-sm font-medium">Overall QA score — daily</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Trend */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="mb-2 text-sm font-medium">Agent trend — weekly</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={agentTrend}>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="Rahul" stroke="#16a34a" />
              <Line dataKey="Neha" stroke="#2563eb" />
              <Line dataKey="Amit" stroke="#f97316" />
              <Line dataKey="Priya" stroke="#eab308" />
              <Line dataKey="Rakesh" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* FCR */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="mb-2 text-sm font-medium">FCR trend — daily</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="fcr" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Critical */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="mb-2 text-sm font-medium">Critical fails</h2>
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
    </div>
  );
}