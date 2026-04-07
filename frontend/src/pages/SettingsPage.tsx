import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { Client } from "@/types";

interface SettingsPayload {
  client_id: number;
  total: number; // ✅ NEW (replace audit_limit_per_day)
  min_call_duration: number;
  max_call_duration: number;
  agents: string[];
  campaign_filter: string[];
  ingroup_filter: string[];
  audit_calls_per_agent: number;
}

// ✅ Default form generator (important)
const getDefaultForm = (clientId: number): SettingsPayload => ({
  client_id: clientId,
  total: 0,
  min_call_duration: 20,
  max_call_duration: 3600,
  agents: [],
  campaign_filter: [],
  ingroup_filter: [],
  audit_calls_per_agent: 0
});

export default function SettingsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const [form, setForm] = useState<SettingsPayload>(
    getDefaultForm(0)
  );

  const [agentDetails, setAgentDetails] = useState<any[]>([]);

  // ✅ Fetch clients
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  // ✅ Auto select first client
  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

  // ✅ Fetch settings with 404 handling
  const settingsQuery = useQuery({
    queryKey: ["settings", clientId],
    queryFn: async () => {
      try {
        const res = await api.get(`/settings/${clientId}`);
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null; // 👈 no settings case
        }
        throw err;
      }
    },
    enabled: !!clientId,
    retry: false
  });

useEffect(() => {
  const total =
    form.agents.length * (form.audit_calls_per_agent || 0);

  if (form.total !== total) {
    setForm((prev) => ({
      ...prev,
      total
    }));
  }
}, [form.agents, form.audit_calls_per_agent]);

  // ✅ Handle form update (single source of truth)
    useEffect(() => {
  if (!clientId) return;

  if (!settingsQuery.data) {
    setForm(getDefaultForm(clientId));
    setAgentDetails([]);
    return;
  }

  const data = settingsQuery.data;

  setAgentDetails(data.agent_details || []);

  setForm({
    client_id: clientId,

    // ✅ FIXED
    audit_calls_per_agent: data.audit_calls_per_agent ?? 0,
    total: data.total ?? 0,

    min_call_duration: data.min_call_duration ?? 20,
    max_call_duration: data.max_call_duration ?? 3600,

    agents: data.agents ?? [],
    campaign_filter: data.campaign_filter ?? [],
    ingroup_filter: data.ingroup_filter ?? []
  });
}, [settingsQuery.data, clientId]);

  // ✅ Save mutation
  const saveSettings = useMutation({
    mutationFn: async () => api.post("/settings", form),
    onSuccess: () => {
      toast.success("Settings updated");
    },
    onError: () => {
      toast.error("Failed to save settings");
    }
  });

  return (
    <div className="space-y-6 max-w-3xl">

  {/* ✅ Client Selector */}
  <div className="glass-card flex items-center justify-between p-4">
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">Client</span>
      <span className="text-sm font-medium text-slate-700">
        Select client to manage settings
      </span>
    </div>

    <select
      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
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

  {/* ✅ Settings Form */}
  <div className="glass-card space-y-6 p-6">
    <div>
      <h2 className="text-lg font-semibold text-slate-800">
        Client Settings
      </h2>
      <p className="text-xs text-slate-500 mt-1">
        Configure audit rules and filters for selected client
      </p>
    </div>

    <div className="grid gap-5 md:grid-cols-2">

      {/* 🔹 Min Duration */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Min Call Duration (sec)
        </label>
        <input
          type="number"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
          value={form.min_call_duration || ""}
          placeholder="e.g. 20"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              min_call_duration: Number(e.target.value)
            }))
          }
        />
      </div>

      {/* 🔹 Max Duration */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Max Call Duration (sec)
        </label>
        <input
          type="number"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
          value={form.max_call_duration || ""}
          placeholder="e.g. 3600"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              max_call_duration: Number(e.target.value)
            }))
          }
        />
      </div>

      {/* 🔹 Agent Filter */}
      <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Agent Out Of ({agentDetails.length})
          </label>

          <select
            multiple
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm h-32 focus:ring-2 focus:ring-emerald-400 outline-none"
            value={form.agents}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (opt) => opt.value
              );

              setForm((prev) => ({
                ...prev,
                agents: selected
              }));
            }}
          >
            {agentDetails.map((agent) => (
              <option key={agent.username} value={agent.username}>
                {agent.displayname}
              </option>
            ))}
          </select>

          {/* ✅ Show selected usernames */}
          <div className="text-xs text-slate-500 mt-1">
            Selected: {form.agents.length ? form.agents.join(", ") : "None"}
          </div>
        </div>


        {/* 🔹 Audit Calls Per Agent */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Audit Calls Per Agent
          </label>
          <input
            type="number"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
            value={form.audit_calls_per_agent || ""}
            placeholder="e.g. 10"
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                audit_calls_per_agent: Number(e.target.value) || 0
              }))
            }
          />
        </div>

        {/* 🔹 Total Calls */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Total Calls
          </label>
          <input
            readOnly
            value={form.total}
            className="rounded-xl border border-amber-200 bg-gray-100 px-3 py-2 text-sm"
          />
        </div>




      {/* 🔹 Campaign Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Campaign Filter
        </label>
        <input
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
          value={form.campaign_filter.length ? form.campaign_filter.join(",") : ""}
          placeholder="Campaign filter (comma separated)"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              campaign_filter: e.target.value.split(",").filter(Boolean)
            }))
          }
        />
      </div>

      {/* 🔹 Ingroup Filter */}
      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Ingroup Filter
        </label>
        <input
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
          value={form.ingroup_filter.length ? form.ingroup_filter.join(",") : ""}
          placeholder="Ingroup filter (comma separated)"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              ingroup_filter: e.target.value.split(",").filter(Boolean)
            }))
          }
        />
      </div>
    </div>

    {/* ✅ Action Button */}
    <div className="flex justify-end">
      <button
        onClick={() => saveSettings.mutate()}
        disabled={saveSettings.isPending}
        className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
      >
        {saveSettings.isPending ? "Saving..." : "Save Settings"}
      </button>
    </div>
  </div>
</div>
  );
}