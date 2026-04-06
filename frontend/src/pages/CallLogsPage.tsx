import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { DataTable } from "@/components/DataTable";
import { Audit, CallLog, Client } from "@/types";
import toast from "react-hot-toast";

export default function CallLogsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(
    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  );
  const [toDate, setToDate] = useState(
    today.toISOString().slice(0, 10)
  );

  // ✅ Clients
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () =>
      (await api.get<Client[]>("/clients")).data
  });

  // ✅ Auto select first client
  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

  // ✅ Calls
  const calls = useQuery({
    queryKey: ["calls", clientId, fromDate, toDate],
    queryFn: async () =>
      (
        await api.get<CallLog[]>("/calls", {
          params: {
            client_id: clientId,
            date_from: `${fromDate}T00:00:00`,
            date_to: `${toDate}T23:59:59`
          }
        })
      ).data,
    enabled: !!clientId,
    refetchInterval: 15000
  });

  // ✅ Audits
  const audits = useQuery({
    queryKey: ["audits", clientId, fromDate, toDate],
    queryFn: async () =>
      (
        await api.get<Audit[]>("/audit", {
          params: {
            client_id: clientId,
            date_from: `${fromDate}T00:00:00`,
            date_to: `${toDate}T23:59:59`
          }
        })
      ).data,
    enabled: !!clientId,
    refetchInterval: 15000
  });

  // ✅ Score Map
  const scoreByCallId = useMemo(() => {
    const map = new Map<string, string>();

    (audits.data ?? []).forEach((audit) => {
      const rawFromJson = audit.audit_json?.percentage;

      const parsedFromJson =
        typeof rawFromJson === "number"
          ? rawFromJson
          : typeof rawFromJson === "string"
          ? Number(rawFromJson)
          : NaN;

      const pct =
        audit.percentage > 0
          ? audit.percentage
          : Number.isFinite(parsedFromJson)
          ? parsedFromJson
          : 0;

      map.set(audit.call_id, `${pct}%`);
    });

    return map;
  }, [audits.data]);

  return (
    <div className="space-y-4">

      {/* ✅ SINGLE ROW: Client + Date + Export */}
      <div className="glass-card flex flex-wrap items-end gap-3 p-4">

        {/* Client */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-600">
            Client
          </label>
          <select
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            value={clientId ?? ""}
            onChange={(e) => setClientId(Number(e.target.value))}
          >
            {!clientsQuery.data?.length && (
              <option value="">No clients available</option>
            )}
            {clientsQuery.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* From */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-600">
            From
          </label>
          <input
            type="date"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        {/* To */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-600">
            To
          </label>
          <input
            type="date"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {/* Export */}
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white"
          onClick={async () => {
            if (!clientId) {
              toast.error("Select a client first");
              return;
            }

            try {
              const response = await api.get("/export", {
                params: {
                  client_id: clientId,
                  from: `${fromDate}T00:00:00`,
                  to: `${toDate}T23:59:59`
                },
                responseType: "blob"
              });

              const url = URL.createObjectURL(
                new Blob([response.data])
              );

              const a = document.createElement("a");
              a.href = url;
              a.download = `call_logs_export_${fromDate}_to_${toDate}.csv`;
              a.click();

              URL.revokeObjectURL(url);
              toast.success("Export downloaded");
            } catch {
              toast.error("Export failed");
            }
          }}
        >
          Export
        </button>
      </div>

      {/* ✅ Table */}
      <DataTable
        headers={[
          "Call ID",
          "Agent",
          "Duration",
          "Status",
          "Score",
          "View"
        ]}
        rows={
          calls.data?.map((call) => [
            call.call_id,
            call.agent_id,
            `${call.duration}s`,
            call.transcript ? "Processed" : "Pending",
            scoreByCallId.get(call.call_id) ??
              (call.transcript
                ? "In Audit Queue"
                : "-"),
            <Link
              key={call.call_id}
              className="text-sky-700 underline"
              to={`/audit?callId=${call.call_id}`}
            >
              View
            </Link>
          ]) ?? []
        }
      />
    </div>
  );
}