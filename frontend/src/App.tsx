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
import ConversationPage from "@/pages/ConversationPage";
import CallAuditLogPage from "@/pages/CallAuditLogPage";
import DrillDownPage from "@/pages/DrillDownPage";
import ScorecardsPage from "@/pages/ScorecardsPage";
import LeadQualityPage from "@/pages/LeadQualityPage";
import FlagsPage from "@/pages/FlagsPage";
import CoachingPage from "@/pages/CoachingPage";
import ServiceOverviewPage from "@/pages/service/ServiceOverviewPage";
import ServiceScoreTrendsPage from "@/pages/service/ServiceScoreTrendsPage";
import ServiceCallAuditPage from "@/pages/service/ServiceCallAuditPage";
import ServiceScorecardPage from "@/pages/service/ServiceScorecardPage";
import ServiceSubParameterDrillPage from "@/pages/service/ServiceSubParameterDrillPage";
import ServiceProcessInsightsPage from "@/pages/service/ServiceProcessInsightsPage";
import ServiceRedFlagsPage from "@/pages/service/ServiceRedFlagsPage";
import ServiceWeeklyReportPage from "@/pages/service/ServiceWeeklyReportPage";
import ServiceTrainingPrioritiesPage from "@/pages/service/ServiceTrainingPrioritiesPage";


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
        <Route path="sales">
          {/* Default tab → Overview */}
          <Route index element={<SalesDashboard />} />

          <Route path="conversation" element={<ConversationPage />} />
          <Route path="audit-log" element={<CallAuditLogPage />} />
          <Route path="drill-down" element={<DrillDownPage />} />
          <Route path="scorecards" element={<ScorecardsPage/>} />
          <Route path="lead-quality" element={<LeadQualityPage/>} />
          <Route path="flags" element={<FlagsPage/>} />
          <Route path="coaching" element={<CoachingPage/>} />
        </Route>

        <Route path="service">
          <Route index element={<ServiceOverviewPage />} />

          <Route path="score-trends" element={<ServiceScoreTrendsPage/>} />
          <Route path="audit-log" element={<ServiceCallAuditPage/>} />
          <Route path="scorecards" element={<ServiceScorecardPage/>} />
          <Route path="drill" element={<ServiceSubParameterDrillPage/>} />
          <Route path="unclear" element={<div>Unclear Rate</div>} />
          <Route path="process" element={<ServiceProcessInsightsPage/>} />
          <Route path="flags" element={<ServiceRedFlagsPage/>} />
          <Route path="training" element={<ServiceTrainingPrioritiesPage/>} />
          <Route path="weekly" element={<ServiceWeeklyReportPage/>} />
        </Route>
      </Route>
    </Routes>
  );
}
