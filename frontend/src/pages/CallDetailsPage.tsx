import { useState } from "react";
import { api } from "@/services/api";
import { Download, FileSpreadsheet } from "lucide-react";

export default function CallDetailsPage() {
  /* ================= DATE HELPERS ================= */

  const today = new Date().toISOString().split("T")[0];

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);

  const firstDayOfMonthString = firstDayOfMonth
    .toISOString()
    .split("T")[0];

  /* ================= STATE ================= */

  const [startDate, setStartDate] = useState<string>(
    firstDayOfMonthString
  );

  const [endDate, setEndDate] = useState<string>(today);

  const [loading, setLoading] = useState(false);

  /* ================= EXPORT ================= */

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      alert("Start date cannot be after end date");
      return;
    }

    setLoading(true);

    try {
      const response = await api.get(
        `/calls/call-details-export?start_date=${startDate}&end_date=${endDate}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      link.setAttribute(
        "download",
        `call_details_${startDate}_${endDate}.xlsx`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Export failed:", error);

      let errorMessage = "Failed to export call details";

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-5">

      {/* PAGE HEADER */}

      <div>
        <h1 className="text-xl font-semibold">
          Call Details
        </h1>

        <p className="text-sm text-gray-500">
          Export call details for Admin users only
        </p>
      </div>

      {/* EXPORT SECTION */}

      <div className="bg-white border rounded-xl p-4 space-y-4">

        {/* TITLE */}

        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />

          <h2 className="font-medium">
            Export Call Details to Excel
          </h2>
        </div>

        {/* DATE FILTERS + EXPORT BUTTON */}

        <div className="flex items-end gap-4 flex-wrap">

          {/* START DATE */}

          <div className="space-y-2">
            <label
              htmlFor="startDate"
              className="text-sm font-medium block"
            >
              Start Date
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);

                if (endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              max={endDate || undefined}
              className="border h-9 px-3 rounded w-[160px]"
            />
          </div>

          {/* END DATE */}

          <div className="space-y-2">
            <label
              htmlFor="endDate"
              className="text-sm font-medium block"
            >
              End Date
            </label>

            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={today}
              className="border h-9 px-3 rounded w-[160px]"
            />
          </div>

          {/* EXPORT BUTTON */}

          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-black text-white flex items-center gap-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />

            {loading ? "Exporting..." : "Export Excel"}
          </button>

        </div>
      </div>
    </div>
  );
}

