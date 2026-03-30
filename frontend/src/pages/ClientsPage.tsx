import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DataTable } from "@/components/DataTable";
import { api } from "@/services/api";
import { Client } from "@/types";

const emptyClient = {
  name: "",
  dialer_ip: "",
  dialer_user: "",
  dialer_pass: "",
  db_host: "",
  db_user: "",
  db_pass: "",
  campaigns: "",
  ingroups: ""
};

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const [form, setForm] = useState(emptyClient);

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  const createClient = useMutation({
    mutationFn: async () => api.post("/clients", form),
    onSuccess: () => {
      toast.success("Client added");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setForm(emptyClient);
      setOpen(false);
    },
    onError: () => toast.error("Failed to add client")
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium"
        >
          Add Client
        </button>
      </div>

      <DataTable
        headers={["Name", "Dialer IP", "Campaigns", "Ingroups", "Created"]}
        rows={
          clients.data?.map((client) => [
            client.name,
            client.dialer_ip,
            client.campaigns,
            client.ingroups,
            new Date(client.created_at).toLocaleString()
          ]) ?? []
        }
      />

      {isOpen && (
        <div className="fixed inset-0 grid place-items-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-3xl space-y-3 p-5">
            <h2 className="text-lg font-semibold">Add Client</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.keys(form).map((key) => (
                <input
                  key={key}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                  placeholder={key}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-slate-700" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm"
                onClick={() => createClient.mutate()}
                disabled={createClient.isPending}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
