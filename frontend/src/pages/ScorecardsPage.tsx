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

type Metric = {
  name: string;
  score: number;
  max: number;
};

type AgentScorecard = {
  agent_id: string;
  name: string;
  calls: number;
  avgScore: number;
  conversion: number;
  metrics: Metric[];
  strengths: string[];
  gaps: string[];
  coaching: string;
};

/* ================= COMPONENT ================= */

export default function AgentScorecardsPage() {
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

  const [selectedAgent, setSelectedAgent] = useState<string>("");

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
      const format = (d: Date): string =>
        d.toISOString().slice(0, 10);

      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data = [] } = useQuery<AgentScorecard[]>({
    queryKey: ["agent-scorecards", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/agent-scorecards?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ================= DEFAULT AGENT ================= */

  useEffect(() => {
    if (!selectedAgent && data.length) {
      setSelectedAgent(data[0].agent_id);
    }
  }, [data, selectedAgent]);

  const agentData: AgentScorecard | undefined =
    data.find((a: AgentScorecard) => a.agent_id === selectedAgent);

  /* ================= HELPERS ================= */

  const getColor = (percent: number): string => {
    if (percent >= 70) return "bg-green-500";
    if (percent >= 40) return "bg-orange-400";
    return "bg-red-500";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Agent Scorecards</h1>
      </div>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
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

        {/* Agent dropdown */}
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          {data.map((a: AgentScorecard) => (
            <option key={a.agent_id} value={a.agent_id}>
              {a.name}
            </option>
          ))}
        </select>

      </div>

      {/* SCORECARD */}
      {agentData ? (
        <div className="bg-white border rounded-xl p-5 space-y-5">

          <h2 className="font-semibold text-lg">
            {agentData.name}
          </h2>

          <p className="text-sm text-gray-600">
            {agentData.calls} calls · Avg {agentData.avgScore}% · Conversion {agentData.conversion}%
          </p>

          {/* Metrics */}
          <div className="space-y-3">
            {agentData.metrics.map((m: Metric, i: number) => {
              const percent = (m.score / m.max) * 100;

              return (
                <div key={i} className="flex items-center gap-4">

                  <div className="w-[160px]">{m.name}</div>

                  <div className="flex-1 bg-gray-200 h-3 rounded">
                    <div
                      className={`h-3 rounded ${getColor(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="w-[90px] text-right">
                    {m.score}/{m.max}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Strengths */}
          <div>
            <h3 className="text-sm font-medium">Strengths</h3>
            {agentData.strengths.map((s: string, i: number) => (
              <div
                key={i}
                className="text-xs bg-green-100 px-2 py-1 rounded mt-1"
              >
                {s}
              </div>
            ))}
          </div>

          {/* Gaps */}

    <div>
      <h3 className="text-sm font-medium">Gaps</h3>

      {agentData.gaps && agentData.gaps.length > 0 ? (
        agentData.gaps.map((g: string, i: number) => (
          <div
            key={i}
            className="text-xs bg-red-100 px-2 py-1 rounded mt-1"
          >
            {g}
          </div>
        ))
      ) : (
        <div className="text-xs text-gray-400 mt-1">
          No gaps found
        </div>
      )}
    </div>

    {/* Coaching */}
    <div>
      <h3 className="text-sm font-medium">Coaching</h3>

      <p className="text-sm">
        {agentData.coaching &&
        agentData.coaching.trim() !== ""
          ? agentData.coaching
          : "No coaching recommendation available"}
      </p>
    </div>

        </div>
      ) : (
      <div className="bg-white border rounded-xl p-10 text-center">
        <p className="text-red-600 font-semibold text-lg">
          NO RESULTS!
        </p>
      </div>
    )}

    </div>
  );
}