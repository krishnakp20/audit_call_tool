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

type SubParam = {
  name: string;
  score: number;
  max: number;
  percent: number;
};

type AgentRow = {
  name: string;
  total: number;
  [key: `sp_${number}`]: number;
};

type ParameterDrillResponse = {
  max: number;
  subParams: SubParam[];
  agents: AgentRow[];
};

/* ================= COMPONENT ================= */

export default function ParameterDrillPage() {
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

  const [parameterIndex, setParameterIndex] = useState<number>(0);

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

  const { data } = useQuery<ParameterDrillResponse>({
    queryKey: [
      "parameter-drill",
      clientId,
      fromDate,
      toDate,
      parameterIndex
    ],
    queryFn: async () => {
      const res = await api.get(
        `/sale-dashboard/parameter-drill?client_id=${clientId}&parameter_index=${parameterIndex}&date_from=${fromDate}&date_to=${toDate}`
      );
      return res.data;
    },
    enabled: !!clientId
  });

  /* ================= HELPERS ================= */

  const getColor = (percent: number): string => {
    if (percent >= 75) return "bg-green-500";
    if (percent >= 50) return "bg-orange-400";
    return "bg-red-500";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <DashboardTabs />

      <div>
        <h1 className="text-xl font-semibold">Parameter Drill-down</h1>
        <p className="text-sm text-gray-500">
          Sub-parameter level performance breakdown
        </p>
      </div>

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">

        <select
          value={clientId || ""}
          onChange={(e) => setClientId(Number(e.target.value))}
          className="border h-9 px-2 rounded"
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

        <select
          value={parameterIndex}
          onChange={(e) =>
            setParameterIndex(Number(e.target.value))
          }
          className="border h-9 px-2 rounded"
        >
          <option value={0}>Opening</option>
          <option value={1}>Purpose</option>
          <option value={2}>Discovery</option>
          <option value={3}>Objection</option>
          <option value={4}>Control</option>
          <option value={5}>Closing</option>
          <option value={6}>CX</option>
        </select>

      </div>

      {/* SUB PARAM */}
      <div className="bg-white border rounded-xl p-4">

        <h2 className="font-semibold mb-4">
          Max Score: {data?.max || 0}
        </h2>

        {data?.subParams?.map((item: SubParam, i: number) => (
          <div key={i} className="flex items-center gap-3 mb-3">

            <span className="w-[200px] text-sm">
              {item.name}
            </span>

            <div className="flex-1 bg-gray-200 h-3 rounded">
              <div
                className={`h-3 rounded ${getColor(item.percent)}`}
                style={{ width: `${item.percent}%` }}
              />
            </div>

            <span className="text-sm w-[120px] text-right">
              {item.score}/{item.max} ({item.percent}%)
            </span>

          </div>
        ))}

      </div>

      {/* AGENT TABLE */}
      <div className="bg-white border rounded-xl overflow-x-auto">

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Agent</th>

              {data?.subParams?.map((sp: SubParam, i: number) => (
                <th key={i} className="p-2 text-center">
                  {sp.name}
                </th>
              ))}

              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>

          <tbody>
            {data?.agents?.map((a: AgentRow, i: number) => (
              <tr key={i} className="border-b text-center">
                <td className="text-left p-2">{a.name}</td>

                {data.subParams.map((_, idx: number) => (
                  <td key={idx}>{a[`sp_${idx}`]}</td>
                ))}

                <td className="font-semibold">{a.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
}

