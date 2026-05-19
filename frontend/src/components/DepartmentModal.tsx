import { useNavigate } from "react-router-dom";

import {
  Briefcase,
  Headset
} from "lucide-react";

import { departmentStorage } from "@/services/department";

type Props = {
  open: boolean;
};

export default function DepartmentModal({
  open
}: Props) {

  const navigate = useNavigate();

  if (!open) return null;

  const handleSelect = (
    department: "sales" | "service"
  ) => {

    // SAVE DEPARTMENT
    departmentStorage.set(
      department
    );

    // NAVIGATE
    navigate(
      department === "sales"
        ? "/sales"
        : "/service"
    );

    // IMPORTANT
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-sky-500 to-violet-600 px-8 py-6 text-white">

          <h2 className="text-3xl font-bold">
            Welcome 👋
          </h2>

          <p className="mt-2 text-sm text-white/90">
            Select your department to continue
          </p>

        </div>

        {/* BODY */}
        <div className="grid gap-6 p-8 md:grid-cols-2">

          {/* SALES */}
          <button
            onClick={() =>
              handleSelect("sales")
            }
            className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-blue-100 p-8 text-left transition-all hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl"
          >

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg">

              <Briefcase size={28} />

            </div>

            <h3 className="text-2xl font-semibold text-slate-800">
              Sales
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Access sales performance,
              lead quality, coaching,
              scorecards and analytics.
            </p>

            <div className="mt-6 text-sm font-medium text-sky-600">
              Continue →
            </div>

          </button>

          {/* SERVICE */}
          <button
            onClick={() =>
              handleSelect("service")
            }
            className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-green-100 p-8 text-left transition-all hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl"
          >

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">

              <Headset size={28} />

            </div>

            <h3 className="text-2xl font-semibold text-slate-800">
              Service
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Access audit logs,
              process insights,
              weekly reports and QA tracking.
            </p>

            <div className="mt-6 text-sm font-medium text-emerald-600">
              Continue →
            </div>

          </button>

        </div>

      </div>

    </div>
  );
}