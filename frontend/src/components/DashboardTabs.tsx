import { DASHBOARD_TABS } from "@/lib/tabs";
import { NavLink } from "react-router-dom";

export default function DashboardTabs() {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {DASHBOARD_TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.path}
          end={tab.path === "/sales"}   // 🔥 IMPORTANT FIX
          className={({ isActive }) =>
            `px-4 py-2 rounded-full text-sm border transition ${
              isActive
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}