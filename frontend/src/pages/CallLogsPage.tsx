import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { DataTable } from "@/components/DataTable";
import { CallLog } from "@/types";

export default function CallLogsPage() {
  const clientId = useUIStore((s) => s.selectedClientId);

  const calls = useQuery({
    queryKey: ["calls", clientId],
    queryFn: async () => (await api.get<CallLog[]>("/calls", { params: { client_id: clientId } })).data,
    enabled: !!clientId,
    refetchInterval: 15000
  });

  return (
    <div className="space-y-4">
      <DataTable
        headers={["Call ID", "Agent", "Duration", "Status", "View"]}
        rows={
          calls.data?.map((call) => [
            call.call_id,
            call.agent_id,
            `${call.duration}s`,
            call.transcript ? "Processed" : "Pending",
            <Link key={call.call_id} className="text-sky-300 underline" to={`/audit?callId=${call.call_id}`}>
              View
            </Link>
          ]) ?? []
        }
      />
    </div>
  );
}
