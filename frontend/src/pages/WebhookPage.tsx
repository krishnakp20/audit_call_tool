import { useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";

import { api } from "@/services/api";

export default function WebhookPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select CSV file");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);

      await api.post("/webhook/upload-csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("CSV Uploaded Successfully");

      setFile(null);
    } catch (error) {
      console.error(error);

      toast.error("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(
      `${import.meta.env.VITE_API_BASE_URL}/webhook/download-csv`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Webhook CSV Manager
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Upload and download call log CSV files
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="glass-card rounded-2xl p-8">

        <div className="mx-auto max-w-xl">

          {/* ICON */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-emerald-100 p-4">
              <FileSpreadsheet
                className="text-emerald-600"
                size={42}
              />
            </div>
          </div>

          {/* FILE INPUT */}
          <div className="space-y-4">

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Select CSV File
              </span>

              <input
                type="file"
                accept=".csv"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              />
            </label>

            {/* FILE NAME */}
            {file && (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Selected File:{" "}
                <span className="font-semibold">
                  {file.name}
                </span>
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex flex-wrap gap-3 pt-2">

              <button
                onClick={handleUpload}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                <Upload size={18} />

                {loading ? "Uploading..." : "Upload CSV"}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <Download size={18} />

                Download CSV
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}