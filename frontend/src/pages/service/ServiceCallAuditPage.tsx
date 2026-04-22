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
  client_id: number;
  date: string;
  duration: string;
  score: number;
  fcr: "Yes" | "No" | "Partial";
  opening: string;
  understanding: string;
  resolution: string;
  comms: string;
  control: string;
  closing: string;
  unclear: string;
};

/* ================= HELPERS ================= */

const safe = (v: any) =>
  v === null || v === undefined || isNaN(v) ? 0 : v;

/* ================= COMPONENT ================= */

export default function ServiceCallAuditPage() {
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

  const [agent, setAgent] = useState("All agents");
  const [score, setScore] = useState("All scores");
  const [fcr, setFcr] = useState("All FCR");
  const [search, setSearch] = useState("");

  /* ✅ PAGINATION */
  const [page, setPage] = useState(1);
  const limit = 15;

  /* ================= CLIENT API ================= */

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clientId, clients]);

  /* ================= DATE LOGIC ================= */

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

  /* ✅ RESET PAGE WHEN FILTER CHANGE */
  useEffect(() => {
    setPage(1);
  }, [clientId, fromDate, toDate, agent, score, fcr, search]);

  /* ================= API ================= */

  const { data: apiData, isLoading } = useQuery({
    queryKey: ["call-audit", clientId, fromDate, toDate, page,limit],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/call-audit-log?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}&page=${page}&limit=${limit}`
      );
      return res.data;
    },
    enabled: !!clientId,
    keepPreviousData: true,   // smooth pagination
    staleTime: 0
  });

  const DATA: Row[] = apiData?.data || [];
  const total = apiData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const agents = [
    "All agents",
    ...new Set(DATA.map((d) => d.agent))
  ];

  /* ================= FILTER ================= */

  const filtered = useMemo(() => {
    return DATA.filter((r) => {
      if (agent !== "All agents" && r.agent !== agent) return false;

      if (fcr !== "All FCR" && r.fcr !== fcr) return false;

      if (score === "Critical (<50)" && r.score >= 50) return false;
      if (score === "Average (50-74)" && (r.score < 50 || r.score > 74))
        return false;
      if (score === "Good (75+)" && r.score < 75) return false;

      if (search && !r.id.toLowerCase().includes(search.toLowerCase()))
        return false;

      return true;
    });
  }, [DATA, agent, score, fcr, search]);

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Call Audit Log</h1>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="h-9 px-2 border rounded"
        >
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 px-2 border rounded"
        >
          <option>Today</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 px-2 border rounded"/>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 px-2 border rounded"/>
          </>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3">
        <input
          placeholder="Search call ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded h-9 px-2"
        />

        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="border rounded h-9 px-2">
          {agents.map((a) => <option key={a}>{a}</option>)}
        </select>

        <select value={score} onChange={(e) => setScore(e.target.value)} className="border rounded h-9 px-2">
          <option>All scores</option>
          <option>Critical (&lt;50)</option>
          <option>Average (50-74)</option>
          <option>Good (75+)</option>
        </select>

        <select value={fcr} onChange={(e) => setFcr(e.target.value)} className="border rounded h-9 px-2">
          <option>All FCR</option>
          <option>Yes</option>
          <option>No</option>
          <option>Partial</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-center">

            <thead className="bg-gray-100">
              <tr className="text-center">
                <th className="px-4 py-2 text-center">ID</th>
                <th className="px-4 py-2 text-center">Agent</th>
                <th className="px-4 py-2 text-center">Date</th>
                <th className="px-4 py-2 text-center">Dur</th>
                <th className="px-4 py-2 text-center">Score</th>
                <th className="px-4 py-2 text-center">FCR</th>
                <th className="px-4 py-2 text-center">Opening</th>
                <th className="px-4 py-2 text-center">Understanding</th>
                <th className="px-4 py-2 text-center">Resolution</th>
                <th className="px-4 py-2 text-center">Comms</th>
                <th className="px-4 py-2 text-center">Control</th>
                <th className="px-4 py-2 text-center">Closing</th>
                <th className="px-4 py-2 text-center">Unclear</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-6 text-gray-400">
                    No data found
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.id}</td>
                    <td className="px-4 py-2">{r.agent}</td>
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">{r.duration}</td>
                    <td className="px-4 py-2 font-semibold">{safe(r.score)}%</td>

                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        r.fcr === "Yes"
                          ? "bg-green-100 text-green-700"
                          : r.fcr === "Partial"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {r.fcr}
                      </span>
                    </td>

                    <td className="px-4 py-2">{r.opening}</td>
                    <td className="px-4 py-2">{r.understanding}</td>
                    <td className="px-4 py-2">{r.resolution}</td>
                    <td className="px-4 py-2">{r.comms}</td>
                    <td className="px-4 py-2">{r.control}</td>
                    <td className="px-4 py-2">{r.closing}</td>
                    <td className="px-4 py-2">{r.unclear}</td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center p-4 text-sm">
          <div>
            Page {page} of {totalPages || 1}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}