import React, { useEffect, useMemo, useState } from "react";
import DashboardTabs from "@/components/DashboardTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { departmentStorage } from "@/services/department";
const department =
  departmentStorage.get();

export default function ConversationPage() {
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

  // ✅ Clients API
  const clientsQuery = useQuery({
    queryKey: ["clients", department],

      queryFn: async () =>
        (
          await api.get<Client[]>(
            `/clients?department=${department}`
          )
        ).data
    });

  // ✅ Default client
  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data]);

      // ✅ Date logic
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

      // ❗ IMPORTANT: skip auto update if custom
      if (dateFilter !== "Custom Range") {
        const format = (d: Date) => d.toISOString().slice(0, 10);
        setFromDate(format(from));
        setToDate(format(to));
      }
    }, [dateFilter]);

    useEffect(() => {
      if (fromDate > toDate) {
        setToDate(fromDate);
      }
    }, [fromDate]);

  // ✅ MAIN API (YOUR API)
  const dashboardQuery = useQuery({
      queryKey: ["conversation-dashboard", clientId, fromDate, toDate],
      queryFn: async () => {
        const res = await api.get(
          `/sale-dashboard/conversation-dashboard?client_id=${clientId}&date_from=${fromDate}&date_to=${toDate}`
        );
        return res.data;
      },
      enabled: !!clientId
    });

    const data = dashboardQuery.data || {};
    const summary = data.summary || {};
    const leadDist = data.lead_distribution || {};
    const conversionByLead = data.conversion_by_lead || {};
    const dropOff = data.drop_off || {};


  return (
    <div className="space-y-5">

      {/* 🔹 Tabs */}
      <DashboardTabs />

      {/* 🔹 Title */}
      <div>
        <h1 className="text-xl font-semibold">
          Conversation Intelligence
        </h1>
        <p className="text-sm text-gray-500">
          AI insights on conversion behavior & call patterns
        </p>
      </div>

      {/* ✅ SIMPLE HEADER (INLINE) */}
      {/* ✅ SIMPLE HEADER (WITH CUSTOM DATE) */}
<div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">

  {/* Client */}
  <select
    className="w-[180px] h-9 border rounded-md px-2 text-sm"
    value={clientId ?? ""}
    onChange={(e) => setClientId(Number(e.target.value))}
  >
    {clientsQuery.data?.map((c: any) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
  </select>

  {/* Date Filter */}
  <select
    className="w-[160px] h-9 border rounded-md px-2 text-sm"
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
  >
    <option>Today</option>
    <option>Last 7 Days</option>
    <option>Last 30 Days</option>
    <option>Custom Range</option>
  </select>

  {/* ✅ Custom Date Inputs */}
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

      {/* ✅ TOP CARDS (API CONNECTED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">CONVERTED</p>
          <p className="text-3xl font-bold text-green-600">
            {summary.conversion ?? 0}%
          </p>
          <p className="text-sm text-gray-500">
            Manager call booked — confirmed
          </p>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">PARTIALLY CONVERTED</p>
          <p className="text-3xl font-bold text-blue-600">
            {summary.partial_conversion ?? 0}%
          </p>
          <p className="text-sm text-gray-500">
            Callback / interest — no firm date
          </p>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">NOT CONVERTED</p>
          <p className="text-3xl font-bold text-red-600">
            {summary.no_conversion ?? 0}%
          </p>
          <p className="text-sm text-gray-500">
            No next step — passive end
          </p>
        </div>
      </div>

      {/* 🔹 Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Conversion by lead type */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-4">
            Conversion by lead type
          </h3>

          {[
              { label: "Hot leads", value: conversionByLead.hot || 0, color: "bg-red-500" },
              { label: "Warm leads", value: conversionByLead.warm || 0, color: "bg-amber-500" },
              { label: "Cold leads", value: conversionByLead.cold || 0, color: "bg-gray-400" }
            ].map((item) => (
            <div key={item.label} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="font-medium text-gray-700">
                  {item.value}%
                </span>
              </div>

              {/* ✅ Thicker Bar */}
              <div className="w-full bg-gray-200 h-3 rounded">
                <div
                  className={`${item.color} h-3 rounded transition-all duration-500`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 mt-4">
            Hot leads converting at 55% — warm leads at only 22% indicate opportunity in objection handling.
          </p>
        </div>

        {/* Lead type distribution */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-4">
            Lead type distribution
          </h3>

          {[
              { label: "Hot", value: leadDist.hot || 0, color: "bg-red-500" },
              { label: "Warm", value: leadDist.warm || 0, color: "bg-amber-500" },
              { label: "Cold", value: leadDist.cold || 0, color: "bg-blue-400" }
            ].map((item) => (
            <div key={item.label} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="font-medium text-gray-700">
                  {item.value}%
                </span>
              </div>

              {/* ✅ Thicker Bar */}
              <div className="w-full bg-gray-200 h-3 rounded">
                <div
                  className={`${item.color} h-3 rounded transition-all duration-500`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 mt-4">
            40% warm leads — biggest opportunity if objection handling improves.
          </p>
        </div>
      </div>

      {/* 🔹 Bottom Insight Section */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold mb-4">
          Conversion drop-off analysis — where calls are lost
        </h3>

        <div className="space-y-4 text-sm text-gray-700">

          <div>
            <p className="font-semibold text-gray-900">
              ● Closing stage — {dropOff.closing ?? 0}% avg score
            </p>
            <p>
              Agents not making explicit ask to book manager call. Passive endings accepted.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">
              ● Objection handling — {dropOff.objection ?? 0}% avg score
            </p>
            <p>
              Investment objections poorly handled. No recovery attempt.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">
              ● Discovery — {dropOff.discovery ?? 0}% calls missed
            </p>
            <p>
              Leads pitched without proper qualification.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">
              ● WhatsApp deflection
            </p>
            <p>
              "Send details on WhatsApp" treated as outcome instead of re-engagement.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}