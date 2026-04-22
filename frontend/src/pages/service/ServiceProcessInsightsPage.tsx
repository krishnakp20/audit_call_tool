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

type ApiResponse = {
  top_cards: any[];
  failures: any[];
  fcr: any[];
  drivers: string[];
};

/* ================= COMPONENT ================= */

export default function ProcessInsightsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);

  const [dateFilter, setDateFilter] = useState("Today");
  const [fromDate, setFromDate] = useState(
    today.toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(
    today.toISOString().slice(0, 10)
  );

  /* ================= CLIENT API ================= */

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data
  });

  /* ✅ AUTO SELECT FIRST CLIENT */
  useEffect(() => {
    if (!clientId && clients?.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  /* ================= DATE FILTER ================= */

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

    // ✅ IMPORTANT: don't override custom
    if (dateFilter !== "Custom Range") {
      const format = (d: Date) => d.toISOString().slice(0, 10);
      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["process-insights", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/process-insights?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const topCards = data?.top_cards || [];
  const failures = data?.failures || [];
  const fcr = data?.fcr || [];
  const drivers = data?.drivers || [];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Process insights</h1>

      {/* ================= FILTER ================= */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        {/* CLIENT */}
        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="border h-9 px-2 rounded"
        >
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* DATE FILTER */}
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

        {/* ✅ CUSTOM DATE */}
        {dateFilter === "Custom Range" && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border h-9 px-2 rounded"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border h-9 px-2 rounded"
            />
          </>
        )}

      </div>

      {/* ================= LOADING ================= */}
      {isLoading && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* ================= TOP CARDS ================= */}
      <div className="grid grid-cols-4 gap-4">
        {topCards.map((c, i) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <div className="text-sm text-gray-500 uppercase">
              {c.title}
            </div>
            <div className={`text-2xl font-semibold ${c.color}`}>
              {c.value}%
            </div>
            <div className="text-sm text-gray-500">
              {c.note}
            </div>
          </div>
        ))}
      </div>

      {/* ================= MAIN GRID ================= */}
      <div className="grid grid-cols-2 gap-5">

        {/* FAILURES */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Ranked process failures</h2>

          {failures.map((f, i) => (
            <div key={i} className="flex gap-3 border-b pb-3">
              <div className={`w-3 h-3 mt-2 rounded-full ${f.color}`} />
              <div>
                <div className="font-medium">{f.title}</div>
                <div className="text-sm text-gray-600">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white border rounded-xl p-5 space-y-5">

          <h2 className="font-semibold">FCR breakdown</h2>

          {fcr.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-40 text-sm">{f.label}</div>

              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className={`${f.color} h-2 rounded`}
                  style={{ width: `${f.value}%` }}
                />
              </div>

              <div className="w-10 text-sm text-right">
                {f.value}%
              </div>
            </div>
          ))}

          <hr />

          <div>
            <h3 className="text-sm font-medium mb-2">
              Top FCR failure drivers
            </h3>

            <div className="flex flex-wrap gap-2">
              {drivers.map((d, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-700"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}