import React, { useEffect, useMemo, useState } from "react";
import DashboardTabs from "@/components/DashboardTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

export default function CallAuditLogPage() {
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

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [agent, setAgent] = useState("All agents");
  const [outcome, setOutcome] = useState("All outcomes");
  const [lead, setLead] = useState("All leads");
  const [score, setScore] = useState("All scores");

  // Clients API
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
      from = new Date();
      from.setDate(today.getDate() - 6);
      to = today;
    }

    if (dateFilter === "Last 30 Days") {
      from = new Date();
      from.setDate(today.getDate() - 29);
      to = today;
    }

    if (dateFilter !== "Custom Range") {
      const format = (d) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  // MAIN API
  const { data, isLoading } = useQuery({
    queryKey: ["call-audit-log", clientId, fromDate, toDate, page],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/call-audit-log?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}&page=${page}&page_size=${pageSize}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const rows = data?.data || [];

  // ✅ Agent dropdown (FIXED)
  const agentList = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.agent_id))];
    return ["All agents", ...unique];
  }, [rows]);

  // ✅ Filters applied
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (agent !== "All agents" && r.agent_id !== agent) return false;

      if (outcome !== "All outcomes" && r.outcome !== outcome) return false;

      if (lead !== "All leads" && r.lead !== lead) return false;

      if (score === "Above 80%" && r.score < 80) return false;
      if (score === "50-79%" && (r.score < 50 || r.score > 79)) return false;
      if (score === "Below 50%" && r.score >= 50) return false;

      return true;
    });
  }, [rows, agent, outcome, lead, score]);

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Call Audit Log</h1>
        <p className="text-sm text-gray-500">
          Detailed call-level quality analysis
        </p>
      </div>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">

        <select
          className="w-[180px] h-9 border rounded-md px-2 text-sm"
          value={clientId ?? ""}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clientsQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="w-[160px] h-9 border rounded-md px-2 text-sm"
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
              className="h-9 border rounded-md px-2 text-sm"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 border rounded-md px-2 text-sm"
            />
          </>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">

        {/* Agent */}
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="border rounded-md h-9 px-2 text-sm"
        >
          {agentList.map((a, i) => (
            <option key={i} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* Outcome */}
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="border rounded-md h-9 px-2 text-sm">
          <option>All outcomes</option>
          <option>Converted</option>
          <option>Partially Converted</option>
          <option>Not Converted</option>
        </select>

        {/* Lead */}
        <select value={lead} onChange={(e) => setLead(e.target.value)} className="border rounded-md h-9 px-2 text-sm">
          <option>All leads</option>
          <option>Hot</option>
          <option>Warm</option>
          <option>Cold</option>
        </select>

        {/* Score */}
        <select value={score} onChange={(e) => setScore(e.target.value)} className="border rounded-md h-9 px-2 text-sm">
          <option>All scores</option>
          <option>Above 80%</option>
          <option>50-79%</option>
          <option>Below 50%</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-x-auto">

        {isLoading && <p className="p-4 text-sm">Loading...</p>}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 text-left">Call ID</th>
                <th className="p-2 text-left">Agent</th>
                <th className="p-2">Date</th>
                <th className="p-2">Lead</th>
                <th className="p-2">Score</th>
                <th className="p-2">Outcome</th>
                <th className="p-2">Opening</th>
                <th className="p-2">Purpose</th>
                <th className="p-2">Discovery</th>
                <th className="p-2">Objection</th>
                <th className="p-2">Control</th>
                <th className="p-2">Closing</th>
                <th className="p-2">CX</th>
                <th className="p-2">Flags</th>
              </tr>
            </thead>

          <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">

                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.agent}</td>
                  <td className="text-center">{row.date}</td>

                  <td className="text-center">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      {row.lead}
                    </span>
                  </td>

                  <td className="text-center font-semibold">
                    {row.score}%
                  </td>

                  <td className="text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          row.outcome === "Converted"
                            ? "bg-green-100 text-green-700"
                            : row.outcome === "Partially Converted"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {row.outcome}
                      </span>
                    </td>

                  <td className="text-center">{row.opening}</td>
                  <td className="text-center">{row.purpose}</td>
                  <td className="text-center">{row.discovery}</td>
                  <td className="text-center">{row.objection}</td>
                  <td className="text-center">{row.control}</td>
                  <td className="text-center">{row.closing}</td>
                  <td className="text-center">{row.cx}</td>

                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {row.flags?.length ? (
                        row.flags.map((f, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded bg-red-100 text-red-600"
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 text-sm">
          <p>
            Page {data?.page || 1} of{" "}
            {Math.ceil((data?.total || 0) / pageSize)}
          </p>

          <div className="space-x-2">
            <button
              className="border px-3 py-1 rounded"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>

            <button
              className="border px-3 py-1 rounded"
              disabled={page * pageSize >= (data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}