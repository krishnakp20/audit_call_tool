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

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyClient);

  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // =========================
  // GET CLIENTS
  // =========================
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () =>
      (await api.get<Client[]>("/clients")).data
  });

  // =========================
  // CREATE CLIENT
  // =========================
  const createClient = useMutation({
    mutationFn: async () =>
      api.post("/clients", form),

    onSuccess: () => {
      toast.success("Client added");

      queryClient.invalidateQueries({
        queryKey: ["clients"]
      });

      setForm(emptyClient);
      setEditingId(null);
      setOpen(false);
    },

    onError: () =>
      toast.error("Failed to add client")
  });

  // =========================
  // UPDATE CLIENT
  // =========================
  const updateClient = useMutation({
    mutationFn: async () =>
      api.put(`/clients/${editingId}`, form),

    onSuccess: () => {
      toast.success("Client updated");

      queryClient.invalidateQueries({
        queryKey: ["clients"]
      });

      setForm(emptyClient);
      setEditingId(null);
      setOpen(false);
    },

    onError: () =>
      toast.error("Failed to update client")
  });

  // =========================
  // DELETE CLIENT
  // =========================
  const deleteClient = useMutation({
    mutationFn: async (id: number) =>
      api.delete(`/clients/${id}`),

    onSuccess: () => {
      toast.success("Client deleted");

      queryClient.invalidateQueries({
        queryKey: ["clients"]
      });
    },

    onError: () =>
      toast.error("Failed to delete client")
  });

  // =========================
  // TOGGLE STATUS
  // =========================
  const toggleStatus = useMutation({
    mutationFn: async (id: number) =>
      api.patch(`/clients/${id}/status`),

    onSuccess: () => {
      toast.success("Status updated");

      queryClient.invalidateQueries({
        queryKey: ["clients"]
      });
    },

    onError: () =>
      toast.error("Failed to update status")
  });

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyClient);
            setOpen(true);
          }}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white"
        >
          Add Client
        </button>
      </div>

      {/* TABLE */}
      <DataTable
        headers={[
          "Name",
          "Dialer IP",
          "Campaigns",
          "Ingroups",
          "Status",
          "Action",
          "Created"
        ]}
        rows={
          clients.data?.map((client) => [
            client.name,
            client.dialer_ip,
            client.campaigns,
            client.ingroups,

            // STATUS
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                client.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {client.is_active
                ? "Active"
                : "Inactive"}
            </span>,

            // ACTIONS
            <div className="flex items-center gap-2">
                {/* VIEW */}
                  <button
                    onClick={() => {
                      setViewClient(client);
                      setIsViewOpen(true);
                    }}
                    className="rounded-md bg-slate-600 px-3 py-1 text-xs text-white hover:bg-slate-700"
                  >
                    View
                  </button>

              {/* STATUS BUTTON */}
              <button
                onClick={() =>
                  toggleStatus.mutate(client.id)
                }
                className={`rounded-md px-3 py-1 text-xs text-white ${
                  client.is_active
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {client.is_active
                  ? "Deactivate"
                  : "Activate"}
              </button>

              {/* EDIT */}
              <button
                onClick={() => {
                  setEditingId(client.id);

                  setForm({
                    name: client.name || "",
                    dialer_ip: client.dialer_ip || "",
                    dialer_user: client.dialer_user || "",
                    dialer_pass: client.dialer_pass || "",
                    db_host: client.db_host || "",
                    db_user: client.db_user || "",
                    db_pass: client.db_pass || "",
                    campaigns: client.campaigns || "",
                    ingroups: client.ingroups || ""
                  });

                  setOpen(true);
                }}
                className="rounded-md bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
              >
                Edit
              </button>

              {/* DELETE */}
              <button
                onClick={() => {
                  const confirmDelete = window.confirm(
                    "Delete this client?"
                  );

                  if (confirmDelete) {
                    deleteClient.mutate(client.id);
                  }
                }}
                className="rounded-md bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>,

            new Date(
              client.created_at
            ).toLocaleString()
          ]) ?? []
        }
      />

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">

          <div className="glass-card w-full max-w-3xl space-y-4 rounded-2xl bg-white p-5">

            {/* TITLE */}
            <h2 className="text-lg font-semibold text-slate-800">
              {editingId
                ? "Edit Client"
                : "Add Client"}
            </h2>

            {/* FORM */}
            <div className="grid gap-3 md:grid-cols-2">

              {Object.keys(form).map((key) => (
                <input
                  key={key}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder={key.replaceAll("_", " ")}
                  value={
                    form[key as keyof typeof form]
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: e.target.value
                    }))
                  }
                />
              ))}

            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2">

              {/* CANCEL */}
              <button
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                  setForm(emptyClient);
                }}
              >
                Cancel
              </button>

              {/* SAVE */}
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                onClick={() => {
                  if (editingId) {
                    updateClient.mutate();
                  } else {
                    createClient.mutate();
                  }
                }}
                disabled={
                  createClient.isPending ||
                  updateClient.isPending
                }
              >
                {editingId
                  ? "Update"
                  : "Save"}
              </button>

            </div>

          </div>

        </div>
      )}

     {/* VIEW MODAL */}
{isViewOpen && viewClient && (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">

    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Client Details
        </h2>

        <button
          onClick={() => {
            setIsViewOpen(false);
            setViewClient(null);
          }}
          className="rounded-md bg-slate-200 px-3 py-1 text-sm"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">

        <div>
          <p className="font-semibold text-slate-600">
            Name
          </p>
          <p>{viewClient.name}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Dialer IP
          </p>
          <p>{viewClient.dialer_ip}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Dialer User
          </p>
          <p>{viewClient.dialer_user}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Dialer Password
          </p>
          <p>{viewClient.dialer_pass}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            DB Host
          </p>
          <p>{viewClient.db_host}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            DB User
          </p>
          <p>{viewClient.db_user}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            DB Password
          </p>
          <p>{viewClient.db_pass}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Campaigns
          </p>
          <p>{viewClient.campaigns}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Ingroups
          </p>
          <p>{viewClient.ingroups}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-600">
            Status
          </p>

          <p>
            {viewClient.is_active
              ? "Active"
              : "Inactive"}
          </p>
        </div>

      </div>

    </div>

  </div>
)}
    </div>
  );
}