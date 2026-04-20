import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from "recharts";
import { MetricCard } from "@/components/StatCard";
import { Calendar, Users, Eye, Search, Download } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { Client } from "@/types";
import { useQualitySummary, useRecalculateSummary, useAgentRecalculateSummary } from "@/hooks/useDashboardData";
import DashboardTabs from "@/components/DashboardTabs";


export default function SalesDashboard() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(today.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [dateFilter, setDateFilter] = useState("Today");
  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const summary = useQualitySummary(clientId, fromDate, toDate);
  const recalcSummary = useRecalculateSummary(clientId, fromDate, toDate);
  const agentSummary = useAgentRecalculateSummary(clientId, fromDate, toDate);

  const toggleRow = (index: number) => {
    setOpenRow(openRow === index ? null : index);
  };

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  // 🔹 Static data (replace with API)
  const stats = {
    totalCalls: summary.data?.total_calls ?? 0,
    conversionRate: summary.data?.conversion ?? 0,
    partialConversion: summary.data?.partial_conversion ?? 0,
    noConversion: summary.data?.no_conversion ?? 0,
    avgQuality: summary.data?.avg_quality_score ?? 0
  };

  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
        setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

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

    if (dateFilter === "Last 90 Days") {
        from = new Date();
        from.setDate(today.getDate() - 89);
        to = today;
    }

    // Format to YYYY-MM-DD
    const format = (d: Date) => d.toISOString().slice(0, 10);

    setFromDate(format(from));
    setToDate(format(to));
  }, [dateFilter]);


  useEffect(() => {
    if (fromDate > toDate) {
        setToDate(fromDate);
    }
  }, [fromDate]);



  const prevRange = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const diffDays =
        Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);

    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevTo.getDate() - (diffDays - 1));

    const format = (d: Date) => d.toISOString().slice(0, 10);

    return {
        from: format(prevFrom),
        to: format(prevTo)
    };
  }, [fromDate, toDate]);

  const prevSummary = useQualitySummary(
        clientId,
        prevRange.from,
        prevRange.to
  );



  const dashboardStats = useMemo(() => {
  if (!summary.data || !prevSummary.data) return null;

  const calcGrowth = (current: number, prev: number) => {
    if (prev === 0) {
      if (current === 0) return 0;
      return 100; // better UX than fake 100%
    }
    return ((current - prev) / prev) * 100;
  };

  const current = summary.data;
  const prev = prevSummary.data;

  return {
    totalCalls: {
      value: current.total_calls ?? 0,
      growth: calcGrowth(
        current.total_calls ?? 0,
        prev.total_calls ?? 0
      )
    },

    conversion: {
      value: current.conversion ?? 0,
      growth: calcGrowth(current.conversion ?? 0, prev.conversion ?? 0)
    },

    partial: {
      value: current.partial_conversion ?? 0,
      growth: calcGrowth(
        current.partial_conversion ?? 0,
        prev.partial_conversion ?? 0
      )
    },

    noConv: {
      value: current.no_conversion ?? 0,
      growth: calcGrowth(
        current.no_conversion ?? 0,
        prev.no_conversion ?? 0
      )
    },

    quality: {
      value: current.avg_quality_score ?? 0,
      growth: calcGrowth(
        current.avg_quality_score ?? 0,
        prev.avg_quality_score ?? 0
      )
    }
  };
}, [summary.data, prevSummary.data]);

  const formatGrowth = (val?: number) => {
    if (val === null || val === undefined) return "--";
    return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
  };



  const chartData = useMemo(() => {
    if (!recalcSummary.data?.sections) return [];

    const sections = recalcSummary.data.sections;

    return Object.entries(sections).map(([key, value]: any) => ({
        name: key
        .replace("_", " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase()),

        score: value.score,
        total: value.total_possible,
        percent: value.percentage
    }));
  }, [recalcSummary.data]);

//   const agentData = [
//     {
//         name: "Sarah Johnson",
//         initials: "SJ",
//         calls: 287,
//         score: 82.3,
//         conversion: 42.5,
//         partial: 25.4,
//         noConv: 32.1,
//         strength: "Strong in Closing",
//         gap: "Opening",
//         details: [
//             { label: "Opening", value: 6, total: 8, color: "text-blue-600" },
//             { label: "Purpose", value: 10, total: 12, color: "text-green-600" },
//             { label: "Discovery", value: 13, total: 15, color: "text-green-600" },
//             { label: "Objection", value: 15, total: 18, color: "text-green-600" },
//             { label: "Call Control", value: 8, total: 10, color: "text-green-600" },
//             { label: "Closing", value: 24, total: 27, color: "text-green-600" },
//             { label: "CX / Experience", value: 9, total: 10, color: "text-green-600" }
//         ]
//     },
//     {
//         name: "Michael Chen",
//         initials: "MC",
//         calls: 264,
//         score: 78.9,
//         conversion: 38.2,
//         partial: 29.5,
//         noConv: 32.3,
//         strength: "Strong in Discovery",
//         gap: "Call Control",
//         details: [
//             { label: "Opening", value: 6, total: 8, color: "text-blue-600" },
//             { label: "Purpose", value: 10, total: 12, color: "text-green-600" },
//             { label: "Discovery", value: 13, total: 15, color: "text-green-600" },
//             { label: "Objection", value: 15, total: 18, color: "text-green-600" },
//             { label: "Call Control", value: 8, total: 10, color: "text-green-600" },
//             { label: "Closing", value: 24, total: 27, color: "text-green-600" },
//             { label: "CX / Experience", value: 9, total: 10, color: "text-green-600" }
//         ]
//     },
//     {
//         name: "Emily Rodriguez",
//         initials: "ER",
//         calls: 251,
//         score: 75.2,
//         conversion: 31.5,
//         partial: 28.3,
//         noConv: 40.2,
//         strength: "Strong in CX",
//         gap: "Objection Handling",
//         details: [
//             { label: "Opening", value: 6, total: 8, color: "text-blue-600" },
//             { label: "Purpose", value: 10, total: 12, color: "text-green-600" },
//             { label: "Discovery", value: 13, total: 15, color: "text-green-600" },
//             { label: "Objection", value: 15, total: 18, color: "text-green-600" },
//             { label: "Call Control", value: 8, total: 10, color: "text-green-600" },
//             { label: "Closing", value: 24, total: 27, color: "text-green-600" },
//             { label: "CX / Experience", value: 9, total: 10, color: "text-green-600" }
//         ]
//     }
//   ];

  const agentData = agentSummary.data ?? [];


  // 🔹 Filtered agents
  // ✅ FIRST: format data
  const formattedAgents = useMemo(() => {
  if (!agentData.length) return [];

  return agentData.map((agent: any) => ({
    name: agent.agentId,
    initials: agent.agentId?.slice(0, 2) || "--",
    calls: agent.totalCalls ?? 0,
    score: agent.score ?? 0,
    conversion: agent.conversion ?? 0,
    partial: agent.partial ?? 0,
    noConv: agent.noConv ?? 0,
    strength: agent.strength ?? "-",
    gap: agent.gap ?? "-",

    details: Object.entries(agent.sections || {}).map(([key, val]: any) => ({
      label: key, // ⚠️ IMPORTANT: don't modify key (your API already clean)
      value: val.score ?? 0,
      total: val.total_possible ?? 0,
      color:
        val.percentage >= 80
          ? "text-green-600"
          : val.percentage >= 60
          ? "text-blue-600"
          : val.percentage >= 40
          ? "text-amber-600"
          : "text-red-600"
    }))
  }));
}, [agentData]);

  // ✅ SECOND: filter
  const filteredAgents = useMemo(() => {
    return formattedAgents.filter((agent) => {
        const matchesDropdown =
        agentFilter === "All Agents" || agent.name === agentFilter;

        const matchesSearch =
        agent.name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesDropdown && matchesSearch;
    });
  }, [agentFilter, searchTerm, formattedAgents]);
console.log(filteredAgents,"filteredAgents==")



  // Inside your component
  const chartDataWithPercent = chartData.map((entry) => {
    let fillColor = "";

    if (entry.percent >= 80) fillColor = "#10b981";
    else if (entry.percent >= 60) fillColor = "#3b82f6";
    else if (entry.percent >= 40) fillColor = "#f59e0b";
    else fillColor = "#ef4444";

    return {
        ...entry,
        fillColor
    };
  });



  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white shadow-md rounded-lg px-4 py-2 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-1">
            {label}
        </p>
        <p className="text-sm text-gray-600">
            Score:{" "}
            <span className="font-semibold text-blue-600">
            {data.score}
            </span>{" "}
            / {data.total}
        </p>
        </div>
    );
  };

  const target = 35;
  const isBelowTarget = stats.conversionRate < target;



  return (
    <div className="space-y-5">
      {/* 🔹 Tabs */}
        <DashboardTabs />
      {/* 🔹 Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Sales Performance Dashboard</h1>
          <p className="text-sm text-gray-500">
            Real-time insights into call quality & conversions
          </p>
        </div>
        {/* <div className="text-xs bg-blue-100 px-3 py-1 rounded-full">
          Last updated: 2 mins ago
        </div> */}
      </div>

      {/* 🔹 Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">

            {/* LEFT SECTION */}
            <div className="flex flex-wrap gap-3 items-center flex-1">

            {/* Client Filter */}
            <div className="flex items-center gap-2">
                <select
                    className="w-[180px] h-9 border rounded-md px-3 text-sm bg-white"
                    value={clientId ?? ""}
                    onChange={(e) => setClientId(Number(e.target.value))}
                >
                    {clientsQuery.data?.map((client) => (
                    <option key={client.id} value={client.id}>
                        {client.name}
                    </option>
                    ))}
                </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />

                <select
                    className="w-[160px] h-9 border rounded-md px-3 text-sm bg-white"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                >
                    <option>Today</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>Custom Range</option>
                </select>

                {/* 🔥 Show date pickers only for custom */}
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

            {/* Agent Filter */}
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <select
                    className="w-[160px] h-9 border rounded-md px-3 text-sm bg-white"
                    value={agentFilter}
                    onChange={(e) => {
                        setAgentFilter(e.target.value);
                        setOpenRow(null); // reset accordion when filter changes
                    }}
                    >
                    <option value="All Agents">All Agents</option>
                    {formattedAgents.map((agent, index) => (
                        <option key={index} value={agent.name}>
                            {agent.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* View Filter */}
            <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <select className="w-[140px] h-9 border rounded-md px-3 text-sm bg-white">
                <option>Team View</option>
                <option>Individual</option>
                </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search agents..."
                    className="w-full h-9 border rounded-md pl-9 pr-3 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            </div>

            {/* RIGHT SECTION */}
            {/* <button className="flex items-center gap-2 h-9 px-4 border rounded-md text-sm hover:bg-gray-100">
            <Download className="w-4 h-4" />
            Export
            </button> */}

        </div>
      </div>

      {/* 🔹 Alert */}
      <div className="bg-gray-50 border border-amber-200 rounded-lg p-4">
        <div
            data-slot="alert-description"
            className="grid justify-items-start gap-1 text-sm text-amber-800"
        >
            <span className="font-semibold">
            Conversion below benchmark:
            </span>
            <span>
                Team conversion rate is{" "}
                <span className="font-semibold">
                    {(stats.conversionRate ?? 0).toFixed(1)}%
                </span>{" "}
                (Target: {target}%).
                {isBelowTarget
                    ? " Focus on improving Closing and Objection Handling."
                    : " Great job! Keep maintaining performance."}
            </span>
        </div>
      </div>

      {/* 🔹 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* <MetricCard title="Total Calls" value="1,247" growth="+12%" type="blue" />
        <MetricCard title="Conversion Rate" value="32.4%" growth="+5.2%" type="green" />
        <MetricCard title="Partial Conversion" value="28.1%" growth="-2.1%" type="indigo" />
        <MetricCard title="No Conversion" value="39.5%" growth="-3.1%" type="red" />
        <MetricCard title="Avg Quality Score" value="76.8%" growth="+3.4%" type="purple" /> */}

        <MetricCard
        title="Total Calls"
        value={stats.totalCalls}
        growth={formatGrowth(dashboardStats?.totalCalls.growth)}
        type="blue"
        />

        <MetricCard
        title="Conversion Rate"
        value={`${stats.conversionRate}%`}
        growth={formatGrowth(dashboardStats?.conversion.growth)}
        type="green"
        />

        <MetricCard
        title="Partial Conversion"
        value={`${stats.partialConversion}%`}
        growth={formatGrowth(dashboardStats?.partial.growth)}
        type="indigo"
        />

        <MetricCard
        title="No Conversion"
        value={`${stats.noConversion}%`}
        growth={formatGrowth(dashboardStats?.noConv.growth)}
        type="red"
        />

        <MetricCard
        title="Avg Quality Score"
        value={`${stats.avgQuality.toFixed(2)}%`}
        growth={formatGrowth(dashboardStats?.quality.growth)}
        type="purple"
        />
      </div>

      {/* 🔹 Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Call Quality Parameter Scoring
        </h2>

        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartDataWithPercent} margin={{ top: 20, right: 20, left: 20, bottom: 80 }}>

            {/* Grid */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* X Axis */}
            <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                interval={0}
                tick={{ fill: "#6b7280", fontSize: 12 }}
            />

            {/* Y Axis */}
            <YAxis
                tick={{ fill: "#6b7280", fontSize: 12 }}
                label={{
                value: "Score",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6b7280" }
                }}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />

            {/* Bars */}
            <Bar
                dataKey="score"
                radius={[8, 8, 0, 0]}
                label={{
                    position: "top",
                    fill: "#374151",
                    fontSize: 12,
                    fontWeight: "bold",
                    formatter: (value: number) => value // or `${value}`
                }}
                >
                {chartDataWithPercent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
            </Bar>
            </BarChart>
        </ResponsiveContainer>

        {/* 🔹 Legend */}
        <div className="mt-4 flex gap-4 text-xs text-gray-600 justify-center">
            <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Excellent (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Good (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span>Fair (40-59%)</span>
            </div>
            <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Needs Work (&lt;40%)</span>
            </div>
        </div>
      </div>


      {/* 🔹 Agent Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
            Agent Performance
            </h2>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm">

            {/* Header */}
            <thead className="border-b bg-gray-50">
                <tr>
                <th className="w-[50px]"></th>
                <th className="text-left px-2 py-2 font-semibold">Agent Name</th>
                <th className="text-center px-2 py-2 font-semibold">Total Calls</th>
                <th className="text-center px-2 py-2 font-semibold">Avg Score</th>
                <th className="text-center px-2 py-2 font-semibold">Conversion %</th>
                <th className="text-center px-2 py-2 font-semibold">Partial %</th>
                <th className="text-center px-2 py-2 font-semibold">No Conv %</th>
                <th className="text-left px-2 py-2 font-semibold">Strength</th>
                <th className="text-left px-2 py-2 font-semibold">Gap</th>
                </tr>
            </thead>

            {/* Body */}
            <tbody>
            {filteredAgents.map((agent, index) => (
                <React.Fragment key={agent.name}>

                {/* 🔹 Main Row */}
                <tr
                    onClick={() => toggleRow(index)}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                >
                    <td className="p-2">
                    <span
                        className={`inline-block transition-transform ${
                        openRow === index ? "rotate-90" : ""
                        }`}
                    >
                        ›
                    </span>
                    </td>

                    <td className="p-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700">
                        {agent.initials}
                        </div>
                        <span className="font-medium text-gray-900">
                        {agent.name}
                        </span>
                    </div>
                    </td>

                    <td className="text-center">{agent.calls}</td>

                    <td className="text-center">
                    <span className="font-semibold text-indigo-600">
                        {agent.score}
                    </span>
                    </td>

                    <td className="text-center">
                    <span
                        className={`px-2 py-1 rounded-md text-sm font-medium ${
                        agent.conversion >= 40
                            ? "bg-green-100 text-green-700"
                            : agent.conversion >= 30
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                    >
                        {agent.conversion}%
                    </span>
                    </td>

                    <td className="text-center text-amber-700">
                    {agent.partial}%
                    </td>

                    <td className="text-center text-red-700">
                    {agent.noConv}%
                    </td>

                    <td>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-300">
                        {agent.strength}
                    </span>
                    </td>

                    <td>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-300">
                        {agent.gap}
                    </span>
                    </td>
                </tr>

                {/* 🔹 Accordion Detail Row */}
                {openRow === index && (
                    <tr className="border-b bg-gray-50">
                    <td colSpan={9}>
                        <div className="py-4 px-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Detailed Parameter Scores
                        </h4>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {agent.details.map((item, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-lg p-3 border border-gray-200"
                            >
                                <p className="text-xs text-gray-600 mb-1">
                                {item.label}
                                </p>
                                <p className={`text-lg font-bold ${item.color}`}>
                                {item.value}
                                <span className="text-xs text-gray-400">
                                    {" "} / {item.total}
                                </span>
                                </p>
                            </div>
                            ))}
                        </div>
                        </div>
                    </td>
                    </tr>
                )}

                </React.Fragment>
            ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}