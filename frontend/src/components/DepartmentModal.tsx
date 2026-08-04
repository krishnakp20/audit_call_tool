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
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0b1415]/95 p-6">

    <div className="w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-2xl">

      {/* Logo */}
      <div className="bg-[#0b1415] pt-6 pb-3">
        <div className="flex items-center justify-center gap-3">

          <div className="relative h-7 w-7">
            <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full bg-red-500"></span>
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full bg-emerald-400"></span>
            <span className="absolute bottom-0 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-amber-400"></span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-white">Call</span>
            <span className="text-red-500">IQ</span>
          </h1>

        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#e9002d] via-[#ef5b16] to-[#f8ba2f] px-10 py-8 text-white">

        <h2 className="text-5xl font-extrabold">
          Welcome back 👋
        </h2>

        <p className="mt-3 text-xl font-medium text-white/90">
          Select your team to continue
        </p>

      </div>

      {/* Cards */}
      <div className="grid gap-6 p-10 md:grid-cols-2">

        {/* Sales */}
        <button
          onClick={() => handleSelect("sales")}
          className="group rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-7 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-pink-600 text-white shadow-lg">
            <Briefcase size={26} />
          </div>

          <h3 className="mt-8 text-4xl font-bold text-slate-900">
            Sales
          </h3>

          <p className="mt-4 text-[17px] leading-8 text-slate-500">
            Access sales performance,
            lead quality, conversion intelligence,
            coaching and agent scorecards.
          </p>

          <div className="mt-8 font-semibold text-red-600">
            Continue →
          </div>

        </button>

        {/* Service */}
        <button
          onClick={() => handleSelect("service")}
          className="group rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-7 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg">
            <Headset size={26} />
          </div>

          <h3 className="mt-8 text-4xl font-bold text-slate-900">
            Support
          </h3>

          <p className="mt-4 text-[17px] leading-8 text-slate-500">
            Access audit logs,
            process insights,
            red flags,
            weekly reports and QA tracking.
          </p>

          <div className="mt-8 font-semibold text-amber-600">
            Continue →
          </div>

        </button>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-10 py-6 text-sm">

        <span className="font-bold uppercase tracking-wider text-slate-400">
          CALLIQ • A DIALDESK PRODUCT
        </span>

        <div className="text-slate-500">
          Wrong account?{" "}
          <span className="cursor-pointer font-semibold text-red-600 hover:underline">
            Switch workspace
          </span>
        </div>

      </div>

    </div>

    {/* Bottom Text */}
    <div className="absolute bottom-8 text-sm text-slate-500">
      🔒 Your data is encrypted · 100% of calls audited, always
    </div>

  </div>
);
}