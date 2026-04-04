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
    queryFn: async () =>
      (
        await api.get<Audit[]>("/audit", {
          params: {
            client_id: clientId
          }
        })
      ).data,
    enabled: !!clientId
  });

  const auditByCall = useQuery({
    queryKey: ["audit-by-call", callId],
    queryFn: async () => (await api.get<Audit>(`/audit/${callId}`)).data,
    enabled: !!callId
  });

  const selectedAudit = useMemo(() => {
    if (callId && auditByCall.data) return auditByCall.data;
    if (!audits.data?.length) return null;
    if (callId) return audits.data.find((a) => a.call_id === callId) ?? null;
    return audits.data[0];
  }, [audits.data, callId, auditByCall.data]);

  if (audits.isLoading || auditByCall.isLoading) {
    return <div className="glass-card p-6 text-slate-700">Loading audit details...</div>;
  }

  if (!selectedAudit && callId) {
    return (
      <div className="glass-card p-6 text-slate-700">
        No audit result found for call <span className="font-semibold">{callId}</span>. This call may still be pending audit.
      </div>
    );
  }

  if (!selectedAudit) {
    return <div className="glass-card p-6 text-slate-700">No audited calls found for this client.</div>;
  }

  const sentimentRaw = selectedAudit.audit_json?.sentiment;
  const sentiment =
    typeof sentimentRaw === "string"
      ? sentimentRaw
      : sentimentRaw && typeof sentimentRaw === "object"
        ? "Neutral"
        : "Neutral";

  const improvementsRaw =
    selectedAudit.audit_json?.improvements ?? selectedAudit.audit_json?.areas_for_improvement;
  const improvements = Array.isArray(improvementsRaw) ? improvementsRaw.map((item) => String(item)) : [];

  const jsonPercentageRaw = selectedAudit.audit_json?.percentage;
  const jsonPercentage =
    typeof jsonPercentageRaw === "number"
      ? jsonPercentageRaw
      : typeof jsonPercentageRaw === "string"
        ? Number(jsonPercentageRaw)
        : NaN;
  const percentage =
    selectedAudit.percentage && selectedAudit.percentage > 0
      ? selectedAudit.percentage
      : Number.isFinite(jsonPercentage)
        ? jsonPercentage
        : 0;

  const jsonRankingRaw = selectedAudit.audit_json?.ranking;
  const ranking =
    selectedAudit.ranking && selectedAudit.ranking !== "N/A"
      ? selectedAudit.ranking
      : typeof jsonRankingRaw === "string"
        ? jsonRankingRaw
        : "N/A";

  const jsonFatalRaw = selectedAudit.audit_json?.fatal_flag ?? selectedAudit.audit_json?.fatal;
  const fatalFlag = typeof jsonFatalRaw === "boolean" ? jsonFatalRaw : Boolean(selectedAudit.fatal_flag);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="text-lg font-semibold">Call {selectedAudit.call_id}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
            Score: {percentage}%
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
            Ranking: {ranking}
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
            Fatal: {fatalFlag ? "Yes" : "No"}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
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
