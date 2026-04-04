import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
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
  const [testTranscript, setTestTranscript] = useState("");
  const [testFile, setTestFile] = useState<File | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const clientId = useUIStore((s) => s.selectedClientId);
  const setClientId = useUIStore((s) => s.setClientId);

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get<Client[]>("/clients")).data
  });

  useEffect(() => {
    if (!clientId && clientsQuery.data?.length) {
      setClientId(clientsQuery.data[0].id);
    }
  }, [clientId, clientsQuery.data, setClientId]);

  const promptsQuery = useQuery({
    queryKey: ["prompts", clientId],
    queryFn: async () => (await api.get<PromptItem[]>(`/prompts/${clientId}`)).data,
    enabled: !!clientId
  });

  const createPrompt = useMutation({
    mutationFn: async () => api.post("/prompts", { client_id: clientId, prompt: editorValue }),
    onSuccess: () => {
      toast.success("Prompt saved");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setEditingPromptId(null);
    }
  });

  const updatePrompt = useMutation({
    mutationFn: async (id: number) => api.put(`/prompts/${id}`, { prompt: editorValue }),
    onSuccess: () => {
      toast.success("Prompt updated");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });

  const activatePrompt = useMutation({
    mutationFn: async (id: number) => api.put(`/prompts/activate/${id}`),
    onSuccess: () => {
      toast.success("Prompt activated");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });

  const deactivatePrompt = useMutation({
    mutationFn: async (id: number) => api.put(`/prompts/deactivate/${id}`),
    onSuccess: () => {
      toast.success("Prompt deactivated");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    }
  });

  const testPrompt = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client first");
      const form = new FormData();
      form.append("client_id", String(clientId));
      form.append("prompt", editorValue);
      if (testTranscript.trim()) form.append("transcript_text", testTranscript.trim());
      if (testFile) form.append("recording_file", testFile);
      const { data } = await api.post("/prompts/test", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data;
    },
    onSuccess: (data) => {
      setTestOutput(data);
      toast.success("Prompt test complete");
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) ? (error.response?.data?.detail as string) : "Prompt test failed";
      toast.error(message || "Prompt test failed");
    }
  });

  const testActivePrompt = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client first");
      const form = new FormData();
      form.append("client_id", String(clientId));
      if (testTranscript.trim()) form.append("transcript_text", testTranscript.trim());
      if (testFile) form.append("recording_file", testFile);
      const { data } = await api.post("/prompts/test-active", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data;
    },
    onSuccess: (data) => {
      setTestOutput(data);
      toast.success("Active prompt test complete");
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) ? (error.response?.data?.detail as string) : "Active prompt test failed";
      toast.error(message || "Active prompt test failed");
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
          {!clientsQuery.data?.length && <option value="">No clients available</option>}
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
          <button
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => {
              if (!clientId) {
                toast.error("Select a client first");
                return;
              }
              if (editingPromptId) {
                updatePrompt.mutate(editingPromptId);
              } else {
                createPrompt.mutate();
              }
            }}
          >
            {editingPromptId ? "Update Prompt" : "Save Prompt"}
          </button>
          {editingPromptId && (
            <button
              className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-slate-700"
              onClick={() => {
                setEditingPromptId(null);
                setEditorValue("You are a QA auditor. Return strict JSON.");
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-medium text-slate-700">Test Prompt with Recording</h3>
          <input
            type="file"
            accept="audio/*"
            className="block w-full text-sm"
            onChange={(e) => setTestFile(e.target.files?.[0] ?? null)}
          />
          <textarea
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
            rows={4}
            placeholder="Optional: paste transcript text if no recording file"
            value={testTranscript}
            onChange={(e) => setTestTranscript(e.target.value)}
          />
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
            onClick={() => testPrompt.mutate()}
          >
            {testPrompt.isPending ? "Testing..." : "Test Prompt"}
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white"
            onClick={() => testActivePrompt.mutate()}
          >
            {testActivePrompt.isPending ? "Testing Active..." : "Test Active Prompt"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h3 className="mb-3 text-sm text-slate-700">Saved Prompts</h3>
          <div className="space-y-2">
            {!promptsQuery.data?.length && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-slate-600">
                No prompts found for the selected client.
              </div>
            )}
            {promptsQuery.data?.map((prompt) => (
              <div key={prompt.id} className="rounded-xl border border-amber-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    v{prompt.version}
                    {prompt.is_active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ACTIVE
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg bg-sky-100 px-3 py-1 text-xs text-sky-700"
                      onClick={() => {
                        setEditingPromptId(prompt.id);
                        setEditorValue(prompt.prompt);
                      }}
                    >
                      Edit
                    </button>
                    {prompt.is_active ? (
                      <button
                        className="rounded-lg bg-rose-100 px-3 py-1 text-xs text-rose-700"
                        onClick={() => deactivatePrompt.mutate(prompt.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white"
                        onClick={() => activatePrompt.mutate(prompt.id)}
                      >
                        Activate
                      </button>
                    )}
                  </div>
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
