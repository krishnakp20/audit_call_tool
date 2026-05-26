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
  label: string;
  percent: number;
  desc: string;
};

type ProbabilityItem = {
  label: string;
  percent: number;
};

type DisqualificationItem = {
  reason: string;
  percent: number;
  agent: string;
};

type LeadQualityResponse = {
  summary: SummaryItem[];
  probability: ProbabilityItem[];
  disqualification: DisqualificationItem[];
};

/* ================= COMPONENT ================= */

export default function LeadQualityPage() {

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

  const { data, isLoading } = useQuery<LeadQualityResponse>({
    queryKey: ["lead-quality", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/lead-quality?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const summary: SummaryItem[] = data?.summary || [];
  const distribution: ProbabilityItem[] = data?.probability || [];
  const disqualification: DisqualificationItem[] = data?.disqualification || [];

  /* ================= HELPERS ================= */

  const getLeadColor = (label: string): string => {
    if (label.includes("Hot")) return "text-red-600";
    if (label.includes("Warm")) return "text-orange-500";
    return "text-blue-600";
  };

  const getBarColor = (p: number): string => {
    if (p >= 35) return "bg-red-500";
    if (p >= 25) return "bg-orange-400";
    return "bg-green-500";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Lead Quality</h1>
        <p className="text-sm text-gray-500">
          Lead intent classification & conversion insights
        </p>
      </div>

      {/* FILTER HEADER */}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.map((s: SummaryItem, i: number) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">
              {s.label}
            </p>
            <p className={`text-2xl font-bold ${getLeadColor(s.label)}`}>
              {s.percent}%
            </p>
            <p className="text-sm text-gray-500">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* MIDDLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* STATIC */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">
            Lead quality classification breakdown
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-red-600">● Hot lead signals</p>
              <p className="text-gray-600">
                Customer actively asks about ROI, business model, operations.
              </p>
            </div>

            <div>
              <p className="font-medium text-orange-500">● Warm lead signals</p>
              <p className="text-gray-600">
                Some interest shown, minor hesitation. Open to discussion.
              </p>
            </div>

            <div>
              <p className="font-medium text-blue-600">● Cold lead signals</p>
              <p className="text-gray-600">
                Low intent — avoids budget discussion, passive responses.
              </p>
            </div>
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">
            Conversion probability distribution
          </h2>

          {distribution.map((d: ProbabilityItem, i: number) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="w-[180px] text-sm text-gray-700">
                {d.label}
              </div>

              <div className="flex-1 bg-gray-200 h-3 rounded">
                <div
                  className={`h-3 rounded ${getBarColor(d.percent)}`}
                  style={{ width: `${d.percent}%` }}
                />
              </div>

              <div className="w-[50px] text-right text-sm font-medium">
                {d.percent}%
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 mt-3">
            AI-judged based on engagement level and closing response.
          </p>
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-x-auto">

        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Lead disqualification analysis
          </h2>
        </div>

        {isLoading && <p className="p-4 text-sm">Loading...</p>}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left">Disqualification reason</th>
              <th className="p-2 text-center">% of non-converted</th>
              <th className="p-2 text-center">Agent</th>
            </tr>
          </thead>

          <tbody>
            {disqualification.map((d: DisqualificationItem, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-2">{d.reason}</td>
                <td className="text-center font-medium text-red-600">
                  {d.percent}%
                </td>
                <td className="text-center">{d.agent}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
}
