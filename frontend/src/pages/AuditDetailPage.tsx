import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useUIStore } from "@/store/uiStore";
import { JSONViewer } from "@/components/JSONViewer";
import { Audit } from "@/types";

export default function AuditDetailPage() {
  const [params] = useSearchParams();
  const callId = params.get("callId");
  const clientId = useUIStore((s) => s.selectedClientId);

  const audits = useQuery({
    queryKey: ["audits", clientId],
    queryFn: async () => (await api.get<Audit[]>("/audit", { params: { client_id: clientId } })).data,
    enabled: !!clientId
  });

  const selectedAudit = useMemo(() => {
    if (!audits.data?.length) return null;
    if (callId) return audits.data.find((a) => a.call_id === callId) ?? audits.data[0];
    return audits.data[0];
  }, [audits.data, callId]);

  if (!selectedAudit) {
    return <div className="glass-card p-6 text-slate-700">No audited calls found for this client.</div>;
  }

  const sentiment = (selectedAudit.audit_json?.sentiment as string) ?? "Neutral";
  const improvements = (selectedAudit.audit_json?.improvements as string[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="text-lg font-semibold">Call {selectedAudit.call_id}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs text-sky-300">
            Score: {selectedAudit.percentage}%
          </span>
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-300">
            Ranking: {selectedAudit.ranking}
          </span>
          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-300">
            Fatal: {selectedAudit.fatal_flag ? "Yes" : "No"}
          </span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
            Sentiment: {sentiment}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h3 className="mb-2 text-sm text-slate-700">Improvements</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {improvements.length ? improvements.map((item) => <li key={item}>- {item}</li>) : <li>- No suggestions</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm text-slate-700">Score Breakdown JSON</h3>
          <JSONViewer value={selectedAudit.audit_json} />
        </div>
      </div>
    </div>
  );
}
