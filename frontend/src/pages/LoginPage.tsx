import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { authStorage } from "@/services/auth";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { departmentStorage } from "@/services/department";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@callaudit.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      authStorage.setToken(data.access_token);
      departmentStorage.clear();

      toast.success("Login successful");
      window.location.href = "/";
    } catch {
      toast.error("Invalid login");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen grid lg:grid-cols-2 bg-white">
    {/* LEFT SIDE */}
    <div className="hidden lg:flex relative bg-[#0D121B] overflow-hidden">

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#7f1d1d40,transparent_40%)]" />

      {/* Dots */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] opacity-30">
        <div className="w-full h-full bg-[radial-gradient(circle,#ff5c0055_2px,transparent_2px)] [background-size:30px_30px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-between px-14 py-12 xl:px-16 xl:py-14 w-full">

        {/* Logo */}
        <div className="flex items-center gap-4">

          <div className="relative w-10 h-10">

            <span className="absolute left-0 top-0 h-4 w-4 rounded-full bg-[#FF2E43] ring-2 ring-white/10"></span>

            <span className="absolute right-0 top-0 h-4 w-4 rounded-full bg-[#39D98A] ring-2 ring-white/10"></span>

            <span className="absolute left-1/2 bottom-0 h-4 w-4 -translate-x-1/2 rounded-full bg-[#FFC542] ring-2 ring-white/10"></span>

          </div>

          <div className="text-5xl font-black tracking-tight">
            <span className="text-white">Call</span>
            <span className="text-[#FF2E43]">IQ</span>
          </div>

        </div>

        {/* Content */}
        <div className="max-w-xl">

          <div className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[2px] text-yellow-300">
            Sales & Support Call Intelligence
          </div>

          <h1 className="mt-10 text-[64px] font-extrabold leading-[1.05] text-white">
            Welcome back.
          </h1>

          <h2 className="text-5xl font-bold text-orange-400">
            Every call, fully audited.
          </h2>

          <p className="mt-8 max-w-[650px] text-[18px] leading-8 text-gray-300">
          Sign in to see today's call coverage, agent scorecards,
          critical flags, and this week's coaching priorities — across
          your entire sales and support team.
          </p>

          <div className="mt-12 flex gap-4 flex-wrap">

            <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-4 py-2.5 text-xs font-medium text-white">
              💯 100% Of Calls Audited
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-4 py-2.5 text-xs font-medium text-white">
              🔒 Enterprise-Grade Security
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-4 py-2.5 text-xs font-medium text-white">
              ⚡ Live in 72 Hours
            </div>

          </div>

        </div>

      </div>
    </div>

    {/* RIGHT SIDE */}
    <div className="flex items-center justify-center bg-white p-8">

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-7"
      >

        <div>

          <p className="text-xs font-semibold uppercase tracking-[3px] text-red-600">
            CALLIQ • A DIALDESK PRODUCT
          </p>

          <h1 className="mt-5 text-[35px] font-extrabold leading-[1.05] text-[#08122E]">
            Sign in to your dashboard
          </h1>

          <p className="mt-3 text-gray-500">
            Enter your workspace credentials to continue.
          </p>

        </div>

        {/* Email */}
        <div>

          <label className="mb-2 block text-sm font-medium">
            Work Email
          </label>

          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-4 outline-none transition focus:border-red-500"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

        </div>

        {/* Password */}
        <div>

          <label className="mb-2 block text-sm font-medium">
            Password
          </label>

          <input
            type="password"
            className="w-full rounded-xl border border-gray-200 px-4 py-4 outline-none transition focus:border-red-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

        </div>

        {/* Remember */}
        <div className="flex items-center justify-between">

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" />
            Remember me
          </label>

          <button
            type="button"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Forgot password?
          </button>

        </div>

        {/* Button */}

        <Button
          disabled={loading}
          className="h-14 w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-lg font-semibold text-white hover:from-red-700 hover:to-red-600"
        >
          {loading ? "Signing In..." : "Sign In →"}
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-gray-400">OR</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        <button
          type="button"
          className="h-14 w-full rounded-xl border border-gray-200 bg-white font-semibold hover:bg-gray-50"
        >
          🔑 Continue with SSO
        </button>

        <p className="text-center text-sm text-gray-500">
          Don't have access?{" "}
          <span className="font-semibold text-red-600">
            Contact your admin
          </span>
        </p>

      </form>

    </div>
  </div>
);
}
