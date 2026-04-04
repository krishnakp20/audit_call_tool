import { Link, useLocation } from "react-router-dom";
import { useUIStore } from "@/store/uiStore";
import { LayoutDashboard, Users, ScrollText, FileAudio2, Sliders } from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/prompts", label: "Prompt Builder", icon: ScrollText },
  { to: "/calls", label: "Call Logs", icon: FileAudio2 },
  { to: "/settings", label: "Settings", icon: Sliders }
];

export function Sidebar() {
  const { pathname } = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside className={`glass-card h-screen p-4 ${collapsed ? "w-20" : "w-64"} transition-all`}>
      <div className="mb-8 text-lg font-semibold text-sky-600">CallAudit</div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-amber-100"
              }`}
            >
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
