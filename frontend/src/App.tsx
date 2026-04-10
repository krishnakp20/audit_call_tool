import { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientsPage from "@/pages/ClientsPage";
import PromptBuilderPage from "@/pages/PromptBuilderPage";
import CallLogsPage from "@/pages/CallLogsPage";
import AuditDetailPage from "@/pages/AuditDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import SalesDashboard from "@/pages/SalesPerformancePage";
import { authStorage } from "@/services/auth";

function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="prompts" element={<PromptBuilderPage />} />
        <Route path="calls" element={<CallLogsPage />} />
        <Route path="audit" element={<AuditDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sales" element={<SalesDashboard />} />
      </Route>
    </Routes>
  );
}
