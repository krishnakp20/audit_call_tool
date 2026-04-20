import React, { useEffect, useMemo, useState } from "react";
import DashboardTabs from "@/components/DashboardTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

export default function AgentScorecardsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [dateFilter, setDateFilter] = useState("Today");

  const [selectedAgent, setSelectedAgent] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data]);

  // Date logic
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
      const format = (d) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  // API
  const { data = [] } = useQuery({
    queryKey: ["agent-scorecards", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/agent-scorecards?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  // default agent
  useEffect(() => {
    if (!selectedAgent && data.length) {
      setSelectedAgent(data[0].agent_id);
    }
  }, [data]);

  const agentData = data.find(a => a.agent_id === selectedAgent);

  const getColor = (percent) => {
    if (percent >= 70) return "bg-green-500";
    if (percent >= 40) return "bg-orange-400";
    return "bg-red-500";
  };

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Agent Scorecards</h1>
      </div>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select value={clientId || ""} onChange={(e)=>setClientId(Number(e.target.value))}>
          {clientsQuery.data?.map(c=>(
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={dateFilter} onChange={(e)=>setDateFilter(e.target.value)}>
          <option>Today</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
          </>
        )}

        {/* Agent dropdown */}
        <select value={selectedAgent} onChange={(e)=>setSelectedAgent(e.target.value)}>
          {data.map(a=>(
            <option key={a.agent_id} value={a.agent_id}>
              {a.name}
            </option>
          ))}
        </select>

      </div>

      {/* SCORECARD */}
      {agentData && (
        <div className="bg-white border rounded-xl p-5 space-y-5">

          <h2 className="font-semibold text-lg">{agentData.name}</h2>

          <p className="text-sm text-gray-600">
            {agentData.calls} calls · Avg {agentData.avgScore}% · Conversion {agentData.conversion}%
          </p>

          {/* Metrics */}
          <div className="space-y-3">
            {agentData.metrics.map((m, i) => {
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
            {agentData.strengths.map((s, i)=>(
              <div key={i} className="text-xs bg-green-100 px-2 py-1 rounded mt-1">
                {s}
              </div>
            ))}
          </div>

          {/* Gaps */}
          <div>
            <h3 className="text-sm font-medium">Gaps</h3>
            {agentData.gaps.map((g, i)=>(
              <div key={i} className="text-xs bg-red-100 px-2 py-1 rounded mt-1">
                {g}
              </div>
            ))}
          </div>

          {/* Coaching */}
          <div>
            <h3 className="text-sm font-medium">Coaching</h3>
            <p className="text-sm">{agentData.coaching}</p>
          </div>

        </div>
      )}

    </div>
  );
}