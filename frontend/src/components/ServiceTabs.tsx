import { NavLink } from "react-router-dom";

export const SERVICE_TABS = [
  { key: "overview", label: "Overview", path: "/service" },
  { key: "score-trends", label: "Score trends", path: "/service/score-trends" },
  { key: "audit-log", label: "Call audit log", path: "/service/audit-log" },
  { key: "scorecards", label: "Agent scorecards", path: "/service/scorecards" },
  { key: "drill", label: "Sub-parameter drill", path: "/service/drill" },
  { key: "process", label: "Process insights", path: "/service/process" },
  { key: "flags", label: "Red flags", path: "/service/flags" },
  { key: "training", label: "Training needs", path: "/service/training" },
  { key: "weekly", label: "Weekly report", path: "/service/weekly" }
];

export default function ServiceTabs() {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {SERVICE_TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.path}
          end={tab.path === "/service"}
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