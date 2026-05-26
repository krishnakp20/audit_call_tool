import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { departmentStorage } from "@/services/department";
const department =
  departmentStorage.get();

type Client = {
  id: number;
  name: string;
};

type Priority = {
  rank: number;
  title: string;
  desc: string;
  tags: string[];
};

type ApiResponse = {
  priorities: Priority[];
};

const getRankColor = (rank: number) => {
  if (rank === 1) return "bg-red-100 text-red-700";
  if (rank === 2) return "bg-red-50 text-red-600";
  if (rank === 3) return "bg-orange-100 text-orange-700";
  if (rank === 4) return "bg-orange-50 text-orange-600";
  return "bg-green-100 text-green-700";
};

export default function TrainingPrioritiesPage() {
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

  /* CLIENT */
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
  }, [clients, clientId]);

  /* DATE */
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

    to = new Date();
    to.setDate(today.getDate() - 1);
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
    const format = (d: Date) => d.toISOString().slice(0, 10);

    setFromDate(format(from));
    setToDate(format(to));
  }
}, [dateFilter]);

  /* API */
  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["training-priorities", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/training-priorities?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const priorities = data?.priorities || [];

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">Training needs</h1>

      {/* FILTER */}
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

      {isLoading && <div className="text-center py-10">Loading...</div>}

      {/* PRIORITIES */}
      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold">
          Team training priorities — ranked by impact
        </h2>

        {priorities.map((p) => (
          <div key={p.rank} className="flex gap-4 border-b pb-4 last:border-none">

            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${getRankColor(p.rank)}`}>
              {p.rank}
            </div>

            <div className="flex-1 space-y-1">

              <div className="font-medium">{p.title}</div>

              <div className="text-sm text-gray-600">
                {p.desc}
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {p.tags.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {t}
                  </span>
                ))}
              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}