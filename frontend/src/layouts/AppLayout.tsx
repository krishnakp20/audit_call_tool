import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar />
      <main className="flex-1">
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}
