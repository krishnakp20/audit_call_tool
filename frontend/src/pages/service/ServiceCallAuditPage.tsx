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

/* ================= STATIC DATA ================= */

const DATA: Row[] = [
  {
    id: "CS-2041",
    agent: "Rahul",
    client_id: 1,
    date: "2026-04-21",
    duration: "4m12s",
    score: 83,
    fcr: "Yes",
    opening: "12/14",
    understanding: "8/14",
    resolution: "12/20",
    comms: "17/20",
    control: "7/10",
    closing: "6/12",
    unclear: "17%"
  },
  {
    id: "CS-2040",
    agent: "Rakesh",
    client_id: 1,
    date: "2026-04-20",
    duration: "6m44s",
    score: 44,
    fcr: "No",
    opening: "8/14",
    understanding: "4/14",
    resolution: "6/20",
    comms: "11/20",
    control: "4/10",
    closing: "2/12",
    unclear: "31%"
  },
  {
    id: "CS-2039",
    agent: "Priya",
    client_id: 1,
    date: "2026-04-19",
    duration: "3m58s",
    score: 62,
    fcr: "Partial",
    opening: "13/14",
    understanding: "7/14",
    resolution: "10/20",
    comms: "14/20",
    control: "6/10",
    closing: "7/12",
    unclear: "19%"
  },
  {
    id: "CS-2038",
    agent: "Neha",
    client_id: 1,
    date: "2026-04-18",
    duration: "5m20s",
    score: 79,
    fcr: "Yes",
    opening: "14/14",
    understanding: "9/14",
    resolution: "15/20",
    comms: "16/20",
    control: "7/10",
    closing: "8/12",
    unclear: "12%"
  }
];

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

  /* ================= CLIENT API ONLY ================= */

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

  /* ================= FILTER LOGIC ================= */

  const filtered = useMemo(() => {
    return DATA.filter((r) => {
      if (clientId && r.client_id !== clientId) return false;

      const rowDate = new Date(r.date).getTime();
      const from = new Date(fromDate).getTime();
      const to = new Date(toDate).getTime();

      if (rowDate < from || rowDate > to) return false;

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
  }, [clientId, fromDate, toDate, agent, score, fcr, search]);

  const agents = ["All agents", ...new Set(DATA.map((d) => d.agent))];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Call Audit Log</h1>

      {/* ✅ HEADER (ONLY CLIENT + DATE) */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">

        <select
          className="h-9 px-2 border rounded"
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clientsQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="h-9 px-2 border rounded"
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
              className="h-9 px-2 border rounded"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 px-2 border rounded"
            />
          </>
        )}
      </div>

      {/* ✅ FILTER BOX (SEPARATE) */}
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">

        <input
          placeholder="Search call ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded h-9 px-2"
        />

        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="border rounded h-9 px-2"
        >
          {agents.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>

        <select
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="border rounded h-9 px-2"
        >
          <option>All scores</option>
          <option>Critical (&lt;50)</option>
          <option>Average (50-74)</option>
          <option>Good (75+)</option>
        </select>

        <select
          value={fcr}
          onChange={(e) => setFcr(e.target.value)}
          className="border rounded h-9 px-2"
        >
          <option>All FCR</option>
          <option>Yes</option>
          <option>No</option>
          <option>Partial</option>
        </select>

      </div>

      {/* ✅ TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm text-gray-700">

      {/* HEADER */}
      <thead className="bg-gray-100 text-gray-800">
        <tr className="text-left">
          <th className="px-4 py-2">ID</th>
          <th className="px-4 py-2">Agent</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Dur</th>
          <th className="px-4 py-2">Score</th>
          <th className="px-4 py-2">FCR</th>
          <th className="px-4 py-2">Opening</th>
          <th className="px-4 py-2">Understanding</th>
          <th className="px-4 py-2">Resolution</th>
          <th className="px-4 py-2">Comms</th>
          <th className="px-4 py-2">Control</th>
          <th className="px-4 py-2">Closing</th>
          <th className="px-4 py-2">Unclear</th>
        </tr>
      </thead>

      {/* BODY */}
      <tbody>
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={13} className="text-center py-6 text-gray-400">
              No data found
            </td>
          </tr>
        ) : (
          filtered.map((r, i) => (
            <tr
              key={i}
              className="border-t hover:bg-gray-50 transition"
            >
              <td className="px-4 py-2 font-medium">{r.id}</td>
              <td className="px-4 py-2">{r.agent}</td>
              <td className="px-4 py-2">{r.date}</td>
              <td className="px-4 py-2">{r.duration}</td>

              <td className="px-4 py-2 font-semibold">
                {r.score}%
              </td>

              {/* FCR BADGE */}
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                    r.fcr === "Yes"
                      ? "bg-green-100 text-green-700"
                      : r.fcr === "Partial"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
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
</div>

    </div>
  );
}