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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 p-4">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md space-y-4 p-8">
        <h1 className="text-center text-2xl font-semibold text-slate-900">Call Audit Login</h1>
        <input
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          disabled={loading}
          className="w-full bg-gradient-to-r from-sky-500 to-violet-500 py-3 text-white"
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
