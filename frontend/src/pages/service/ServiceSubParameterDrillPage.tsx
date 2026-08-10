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

  const fromDate = useUIStore((s) => s.fromDate);
  const toDate = useUIStore((s) => s.toDate);
  const dateFilter = useUIStore((s) => s.dateFilter);

  const setFromDate = useUIStore((s) => s.setFromDate);
  const setToDate = useUIStore((s) => s.setToDate);
  const setDateFilter = useUIStore((s) => s.setDateFilter);

  /* ================= STATE ================= */

  const [selectedAgent, setSelectedAgent] =
    useState<string>("");

  const [parameterIndex, setParameterIndex] =
    useState<number>(0);

  const sectionNames = [
    "Opening",
    "Communication",
    "Probing & Resolution",
    "Process Compliance",
    "Closure",
  ];

  /* ================= CLIENT ================= */

  const {
    data: clients = [],
    isLoading: clientLoading,
  } = useQuery<Client[]>({
    queryKey: ["clients", department],

    queryFn: async () =>
      (
        await api.get<Client[]>(
          `/clients?department=${department}`
        )
      ).data,
  });

  /* ================= AUTO CLIENT ================= */

  useEffect(() => {
    if (!clientId && clients.length > 0) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId, setClientId]);

  /* ================= DATE FIX ================= */

  useEffect(() => {
    const currentDate = new Date();

    let from = new Date();
    let to = new Date();

    if (dateFilter === "Today") {
      from = currentDate;
      to = currentDate;
    }

    if (dateFilter === "Yesterday") {
      from = new Date();
      from.setDate(currentDate.getDate() - 1);
      to = new Date(from);
    }

    if (dateFilter === "Last 7 Days") {
      from.setDate(currentDate.getDate() - 6);
    }

    if (dateFilter === "Last 30 Days") {
      from.setDate(currentDate.getDate() - 29);
    }

    if (dateFilter !== "Custom Range") {
      const format = (d: Date) =>
        d.toISOString().slice(0, 10);

      setFromDate(format(from));
      setToDate(format(to));
    }
  }, [
    dateFilter,
    setFromDate,
    setToDate,
  ]);

  /* ================= API ================= */

  const {
    data,
    isLoading,
  } = useQuery<ApiResponse>({
    queryKey: [
      "sub-param",
      clientId,
      fromDate,
      toDate,
      parameterIndex,
    ],

    queryFn: async () => {
      const res = await api.get(
        `/service-dashboard/sub-parameter-drill?client_id=${clientId}&parameter_index=${parameterIndex}&date_from=${fromDate}&date_to=${toDate}`
      );

      return res.data;
    },

    enabled: !!clientId,
  });

  /* ================= DATA ================= */

  const agents = data?.agent_list || [];

  /* ================= AUTO SELECT AGENT ================= */

  useEffect(() => {
    if (agents.length > 0) {
      setSelectedAgent((currentAgent) => {
        /*
         * Keep currently selected agent
         * if that agent still exists.
         */
        if (
          currentAgent &&
          agents.includes(currentAgent)
        ) {
          return currentAgent;
        }

        /*
         * Otherwise select first available agent.
         */
        return agents[0];
      });
    } else {
      /*
       * Clear selected agent if
       * API returns no agents.
       */
      setSelectedAgent("");
    }
  }, [agents]);

  /* ================= SELECTED AGENT ROW ================= */

  const agentRows = (data?.agents || []).filter(
    (agent) => agent.name === selectedAgent
  );

  /* ================= SELECTED AGENT DATA ================= */

  const selectedAgentData = (
    data?.agents || []
  ).find(
    (agent) => agent.name === selectedAgent
  );

  /* ================= SUB PARAMETERS ================= */

  const subParams = selectedAgentData
    ? (data?.sub_params || []).map((p) => {
        const key = p.label
          .toLowerCase()
          .replace(/&/g, "")
          .replace(/\//g, "")
          .replace(/ /g, "_");

        return {
          ...p,
          value: safe(
            selectedAgentData[key]
          ),
        };
      })
    : [];

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      <ServiceTabs />

      <h1 className="text-xl font-semibold">
        Sub-parameter drill
      </h1>

      {/* ================= HEADER ================= */}

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">

        {/* ================= CLIENT ================= */}

        <select
          value={clientId ?? ""}
          onChange={(e) =>
            setClientId(
              Number(e.target.value)
            )
          }
          className="border h-9 px-2 rounded"
        >
          {!clientId && (
            <option value="">
              Select Client
            </option>
          )}

          {clients.map((client) => (
            <option
              key={client.id}
              value={client.id}
            >
              {client.name}
            </option>
          ))}
        </select>

        {/* ================= DATE ================= */}

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

        {/* ================= CUSTOM RANGE ================= */}

        {dateFilter === "Custom Range" && (
          <>
            <input
              type="date"
              value={fromDate}
              max={todayDate}
              onChange={(e) => {
                setFromDate(
                  e.target.value
                );

                if (
                  toDate < e.target.value
                ) {
                  setToDate(
                    e.target.value
                  );
                }
              }}
              className="border h-9 px-2 rounded"
            />

            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={todayDate}
              onChange={(e) =>
                setToDate(
                  e.target.value
                )
              }
              className="border h-9 px-2 rounded"
            />
          </>
        )}

        {/* ================= AGENT ================= */}

        <select
          value={selectedAgent}
          onChange={(e) =>
            setSelectedAgent(
              e.target.value
            )
          }
          className="border h-9 px-2 rounded min-w-[180px]"
        >
          {agents.length === 0 ? (
            <option value="">
              No Agents
            </option>
          ) : (
            agents.map((agent) => (
              <option
                key={agent}
                value={agent}
              >
                {agent}
              </option>
            ))
          )}
        </select>

        {/* ================= PARAMETER ================= */}

        <select
          value={parameterIndex}
          onChange={(e) =>
            setParameterIndex(
              Number(e.target.value)
            )
          }
          className="border h-9 px-2 rounded"
        >
          <option value={0}>
            Opening
          </option>

          <option value={1}>
            Communication
          </option>

          <option value={2}>
            Probing & Resolution
          </option>

          <option value={3}>
            Process Compliance
          </option>

          <option value={4}>
            Closure
          </option>
        </select>

      </div>

      {/* ================= LOADING ================= */}

      {(isLoading || clientLoading) && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* ================= NO AGENT ================= */}

      {!isLoading &&
        !clientLoading &&
        !selectedAgent && (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
            No agent data found
          </div>
        )}

      {/* ================= SUB PARAMETERS ================= */}

      {!isLoading &&
        selectedAgent && (
          <div className="bg-white border rounded-xl p-5 space-y-3">

            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {sectionNames[
                  parameterIndex
                ]}
              </h2>

              <span className="text-sm text-gray-500">
                Agent: {selectedAgent}
              </span>
            </div>

            {subParams.length === 0 ? (
              <div className="py-6 text-center text-gray-400">
                No sub-parameter data
              </div>
            ) : (
              subParams.map((p, i) => (
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
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            safe(p.value)
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="w-16 text-sm text-right">
                    {safe(p.value)}%
                  </div>

                </div>
              ))
            )}

          </div>
        )}

      {/* ================= TABLE ================= */}

      {!isLoading &&
        selectedAgent && (
          <div className="bg-white border rounded-xl p-5">

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Agent view
              </h3>

              <span className="text-sm text-gray-500">
                {selectedAgent}
              </span>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-sm text-center">

                <thead className="border-b">
                  <tr>

                    <th className="text-left">
                      Agent
                    </th>

                    {subParams.map(
                      (p, i) => (
                        <th key={i}>
                          {p.label}
                        </th>
                      )
                    )}

                  </tr>
                </thead>

                <tbody>

                  {agentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          subParams.length + 1
                        }
                        className="py-6 text-gray-400"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    agentRows.map(
                      (agent, i) => (
                        <tr
                          key={i}
                          className="border-b hover:bg-gray-50"
                        >

                          <td className="text-left font-medium">
                            {agent.name}
                          </td>

                          {subParams.map(
                            (p, idx) => {

                              const key =
                                p.label
                                  .toLowerCase()
                                  .replace(
                                    /&/g,
                                    ""
                                  )
                                  .replace(
                                    /\//g,
                                    ""
                                  )
                                  .replace(
                                    / /g,
                                    "_"
                                  );

                              return (
                                <td
                                  key={idx}
                                  className="py-2"
                                >
                                  {safe(
                                    agent[key]
                                  )}
                                  %
                                </td>
                              );
                            }
                          )}

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

    </div>
  );
}

