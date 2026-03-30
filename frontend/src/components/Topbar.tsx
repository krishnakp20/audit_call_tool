import { LogOut, Menu } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { authStorage } from "@/services/auth";
import toast from "react-hot-toast";

export function Topbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleLogout = () => {
    authStorage.clearToken();
    toast.success("Logged out");
    window.location.href = "/login";
  };

  return (
    <header className="glass-card mb-6 flex items-center justify-between p-4">
      <button className="rounded-lg bg-amber-100 p-2 text-slate-700" onClick={toggleSidebar}>
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-700">Multi-tenant Call Audit System</div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-rose-600"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
