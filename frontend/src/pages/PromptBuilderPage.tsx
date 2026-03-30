import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/services/api";
import { JSONViewer } from "@/components/JSONViewer";
import { useUIStore } from "@/store/uiStore";
import { Client } from "@/types";

interface PromptItem {
  id: number;
  prompt: string;
  version: number;
  is_active: boolean;
}

export default function PromptBuilderPage() {
  const queryClient = useQueryClient();
  const [editorValue, setEditorValue] = useState("You are a QA auditor. Return strict JSON.");
  const [testOutput, setTestOutput] = useState<Record<string, unknown>>({});
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  const promptsQuery = useQuery({
    queryKey: ["prompts", clientId],
    queryFn: async () => (await api.get<PromptItem[]>(`/prompts/${clientId}`)).data,
    enabled: !!clientId
  });

  const createPrompt = useMutation({
    mutationFn: async () => api.post("/prompts", { client_id: clientId, prompt: editorValue }),
    onSuccess: () => {
      toast.success("Prompt saved");
      queryClient.invalidateQueries({ queryKey: ["prompts", clientId] });
    }
  });

  const activatePrompt = useMutation({
    mutationFn: async (id: number) => api.put(`/prompts/activate/${id}`),
    onSuccess: () => {
      toast.success("Prompt activated");
      queryClient.invalidateQueries({ queryKey: ["prompts", clientId] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="glass-card flex items-center gap-3 p-4">
        <span className="text-sm text-slate-600">Client</span>
        <select
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
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

      <div className="glass-card p-4">
        <h2 className="mb-3 text-sm text-slate-600">Prompt Editor</h2>
        <Editor
          height="360px"
          defaultLanguage="markdown"
          value={editorValue}
          onChange={(v) => setEditorValue(v ?? "")}
          theme="vs-light"
        />
        <div className="mt-3 flex gap-2">
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm" onClick={() => createPrompt.mutate()}>
            Save Prompt
          </button>
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm"
            onClick={() =>
              setTestOutput({
                expected_json_shape: { total_score: 84, percentage: 84, fatal_flag: false, improvements: ["..."] },
                prompt_preview: editorValue.slice(0, 120)
              })
            }
          >
            Test
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h3 className="mb-3 text-sm text-slate-700">Saved Prompts</h3>
          <div className="space-y-2">
            {promptsQuery.data?.map((prompt) => (
              <div key={prompt.id} className="rounded-xl border border-amber-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>v{prompt.version}</span>
                  <button
                    className={`rounded-lg px-3 py-1 text-xs ${prompt.is_active ? "bg-emerald-600 text-white" : "bg-amber-100 text-slate-700"}`}
                    onClick={() => activatePrompt.mutate(prompt.id)}
                  >
                    {prompt.is_active ? "Active" : "Activate"}
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{prompt.prompt}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm text-slate-700">AI Response JSON</h3>
          <JSONViewer value={testOutput} />
        </div>
      </div>
    </div>
  );
}
