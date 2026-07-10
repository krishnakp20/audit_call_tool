import React, { useEffect, useMemo, useState } from "react";
import ServiceTabs from "@/components/ServiceTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { departmentStorage } from "@/services/department";

const department = departmentStorage.get();

/* ================= TYPES ================= */

type Client = {
  id: number;
  name: string;
};

type SubParam = {
  label: string;
  value: number;
  late?: number;
};

type AgentRow = {
  name: string;
  [key: string]: any;
};

type ApiResponse = {
  sub_params: SubParam[];
  agents: AgentRow[];
  agent_list: string[];
};

/* ================= HELPERS ================= */

const safe = (v: any) =>
  v === null || v === undefined || isNaN(v) ? 0 : v;

const getColor = (v: number) => {
  if (v >= 80) return "bg-green-500";
  if (v >= 60) return "bg-orange-500";
  return "bg-red-500";
};

/* ================= COMPONENT ================= */

export default function SubParameterDrillPage() {
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

  /* ✅ IMPORTANT */
  const [selectedAgent, setSelectedAgent] = useState("All Agents");
  const [parameterIndex, setParameterIndex] = useState(0);

    const sectionNames = [
      "Opening",
      "Communication",
      "Probing & Resolution",
      "Process Compliance",
      "Closure"
    ];

  /* ================= CLIENT ================= */

  const {
    data: clients = [],
    isLoading: clientLoading
  } = useQuery<Client[]>({
    queryKey: ["clients", department],

    queryFn: async () =>
      (
        await api.get<Client[]>(
          `/clients?department=${department}`
        )
      ).data
  });

  /* ================= AUTO CLIENT ================= */

  useEffect(() => {
    if (!clientId && clients.length) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId, setClientId]);

  /* ================= DATE FIX ================= */

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
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(today.getDate() - 29);
    }

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) =>
        d.toISOString().slice(0, 10);

      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [dateFilter]);

  /* ================= API ================= */

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: [
      "sub-param",
      clientId,
      fromDate,
      toDate,
      parameterIndex
    ],

    queryFn: async () => {
      const res = await api.get(
      `/service-dashboard/sub-parameter-drill?client_id=${clientId}&parameter_index=${parameterIndex}&date_from=${fromDate}&date_to=${toDate}`
    );

      return res.data;
    },

    enabled: !!clientId
  });

  /* ================= DATA ================= */

  const agents = data?.agent_list || [];

  /* ✅ SHOW ALL AGENTS BY DEFAULT */
  const agentRows =
    selectedAgent === "All Agents"
      ? data?.agents || []
      : (data?.agents || []).filter(
          (a) => a.name === selectedAgent
        );

  /* ✅ SUB PARAM ALSO CHANGE */
  const subParams =
  selectedAgent === "All Agents"
    ? data?.sub_params || []
    : (() => {
        const found = (data?.agents || []).find(
          (a) => a.name === selectedAgent
        );

        if (!found) return [];

        return (data?.sub_params || []).map((p) => ({
          ...p,
          value: safe(
            found[
              p.label
                .toLowerCase()
                .replaceAll("&", "")
                .replaceAll("/", "")
                .replaceAll(" ", "_")
            ]
          )
        }));
      })();

  /* ================= UI ================= */

  return (
    <div className="space-y-5">
      <ServiceTabs />

      <h1 className="text-xl font-semibold">
        Sub-parameter drill
      </h1>

      {/* ================= HEADER ================= */}

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">

        {/* CLIENT */}

        <select
          value={clientId ?? ""}
          onChange={(e) =>
            setClientId(Number(e.target.value))
          }
          className="border h-9 px-2 rounded"
        >
          {!clientId && (
            <option value="">Select Client</option>
          )}

          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* DATE */}

        <select
          value={dateFilter}
          onChange={(e) =>
            setDateFilter(e.target.value)
          }
          className="border h-9 px-2 rounded"
        >
          <option>Today</option>
          <option>Yesterday</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Custom Range</option>
        </select>

        {/* CUSTOM RANGE */}

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

        {/* AGENT */}

        <select
          value={selectedAgent}
          onChange={(e) =>
            setSelectedAgent(e.target.value)
          }
          className="border h-9 px-2 rounded min-w-[180px]"
        >
          <option value="All Agents">
            All Agents
          </option>

          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
  value={parameterIndex}
  onChange={(e) =>
    setParameterIndex(Number(e.target.value))
  }
  className="border h-9 px-2 rounded"
>
  <option value={0}>Opening</option>
  <option value={1}>Communication</option>
  <option value={2}>Probing & Resolution</option>
  <option value={3}>Process Compliance</option>
  <option value={4}>Closure</option>
</select>
      </div>

      {/* ================= LOADING ================= */}

      {(isLoading || clientLoading) && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* ================= SUB PARAMS ================= */}

      {!isLoading && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">
              {sectionNames[parameterIndex]}
            </h2>

          {subParams.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3"
            >
              <div className="w-56 text-sm">
                {p.label}
              </div>

              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className={`h-2 rounded ${getColor(
                    safe(p.value)
                  )}`}
                  style={{
                    width: `${safe(p.value)}%`
                  }}
                />
              </div>

              <div className="w-16 text-sm text-right">
                {safe(p.value)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TABLE ================= */}

      {!isLoading && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="mb-3">Agent view</h3>

          <table className="w-full text-sm text-center">
            <thead className="border-b">
                  <tr>
                    <th className="text-left">Agent</th>

                    {subParams.map((p, i) => (
                      <th key={i}>{p.label}</th>
                    ))}
                  </tr>
                </thead>

            <tbody>
              {agentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={subParams.length + 1}
                    className="py-6 text-gray-400"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                agentRows.map((a, i) => (
                  <tr
                    key={i}
                    className="border-b"
                  >
                    <td className="text-left">
                      {a.name}
                    </td>

                    {subParams.map((p, idx) => (
                      <td key={idx}>
                        {safe(
                          a[
                            p.label
                              .toLowerCase()
                              .replaceAll(" ", "_")
                          ]
                        )}
                        %
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}