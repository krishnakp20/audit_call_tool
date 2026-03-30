import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";

interface SettingsPayload {
  client_id: number;
  audit_limit_per_day: number;
  min_call_duration: number;
  max_call_duration: number;
  agents: string[];
  campaign_filter: string[];
  ingroup_filter: string[];
}

export default function SettingsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);
  const [form, setForm] = useState<SettingsPayload>({
    client_id: clientId ?? 0,
    audit_limit_per_day: 100,
    min_call_duration: 20,
    max_call_duration: 3600,
    agents: [],
    campaign_filter: [],
    ingroup_filter: []
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", clientId],
    queryFn: async () => (await api.get(`/settings/${clientId}`)).data,
    enabled: !!clientId,
    retry: false
  });

  useEffect(() => {
    if (clientId) {
      setForm((p) => ({ ...p, client_id: clientId }));
    }
  }, [clientId]);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async () => api.post("/settings", form),
    onSuccess: () => toast.success("Settings updated"),
    onError: () => toast.error("Failed to save settings")
  });

  return (
    <div className="glass-card max-w-2xl space-y-4 p-5">
      <h2 className="text-lg font-semibold">Client Settings</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="number"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
          placeholder="Min duration"
          value={form.min_call_duration}
          onChange={(e) => setForm((p) => ({ ...p, min_call_duration: Number(e.target.value) }))}
        />
        <input
          type="number"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
          placeholder="Max duration"
          value={form.max_call_duration}
          onChange={(e) => setForm((p) => ({ ...p, max_call_duration: Number(e.target.value) }))}
        />
        <input
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
          placeholder="Agent filter (comma separated)"
          value={form.agents.join(",")}
          onChange={(e) => setForm((p) => ({ ...p, agents: e.target.value.split(",").filter(Boolean) }))}
        />
        <input
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
          placeholder="Campaign filter (comma separated)"
          value={form.campaign_filter.join(",")}
          onChange={(e) => setForm((p) => ({ ...p, campaign_filter: e.target.value.split(",").filter(Boolean) }))}
        />
        <input
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 md:col-span-2"
          placeholder="Ingroup filter (comma separated)"
          value={form.ingroup_filter.join(",")}
          onChange={(e) => setForm((p) => ({ ...p, ingroup_filter: e.target.value.split(",").filter(Boolean) }))}
        />
      </div>
      <button
        onClick={() => saveSettings.mutate()}
        className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2 text-sm font-medium"
      >
        Save Settings
      </button>
    </div>
  );
}
