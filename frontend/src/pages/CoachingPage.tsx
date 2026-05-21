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

type CoachingItem = {
  rank: number;
  title: string;
  desc: string;
  color: "red" | "orange" | "green";
  tags: string[];
};

type CoachingResponse = {
  coaching: CoachingItem[];
};

/* ================= COMPONENT ================= */

export default function CoachingNeedsPage() {

  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState<string>(
    today.toISOString().slice(0,10)
  );
  const [toDate, setToDate] = useState<string>(
    today.toISOString().slice(0,10)
  );
  const [dateFilter, setDateFilter] = useState<string>("Today");

  /* ================= CLIENTS ================= */

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
  }, [clientId, clients, setClientId]);

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
      const f = (d: Date): string =>
        d.toISOString().slice(0,10);

      setFromDate(f(from));
      setToDate(f(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data } = useQuery<CoachingResponse>({
    queryKey: ["coaching", clientId, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/coaching-needs?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  const coachingData: CoachingItem[] = data?.coaching || [];

  /* ================= HELPERS ================= */

  const getTagColor = (tag: string): string => {
    if (tag === "Immediate") return "bg-red-100 text-red-600";
    if (tag.includes("Agent")) return "bg-gray-100 text-gray-700";
    return "bg-green-100 text-green-700";
  };

  const getRankColor = (color: CoachingItem["color"]): string => {
    if (color === "red") return "bg-red-100 text-red-600";
    if (color === "orange") return "bg-orange-100 text-orange-600";
    return "bg-green-100 text-green-600";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Coaching Needs</h1>
        <p className="text-sm text-gray-500">
          Team coaching priorities ranked by conversion impact
        </p>
      </div>

      {/* FILTER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId ?? ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="h-9 border px-2 rounded"
        >
          {clients?.map((c: Client) => (
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
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {dateFilter === "Custom Range" && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFromDate(e.target.value)
              }
            />
            <input
              type="date"
              value={toDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setToDate(e.target.value)
              }
            />
          </>
        )}
      </div>

      {/* LIST */}
      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold">
          Team coaching priorities — ranked by conversion impact
        </h2>

        {coachingData.map((item: CoachingItem, i: number) => (
          <div key={i} className="border-t pt-4">

            <div className="flex items-start gap-3">

              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${getRankColor(item.color)}`}>
                {item.rank}
              </div>

              <div className="flex-1">

                <p className="text-sm font-medium">
                  {item.title}
                </p>

                <p className="text-sm text-gray-600 mt-1">
                  {item.desc}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {item.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 text-xs rounded ${getTagColor(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}