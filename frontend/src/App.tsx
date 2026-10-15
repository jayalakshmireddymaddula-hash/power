import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';

// Authenticated pages
import { DashboardPage } from './pages/DashboardPage';
import { RequestsListPage } from './pages/RequestsListPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { WorkflowDesignerPage } from './pages/WorkflowDesignerPage';
import { ExecutionsPage } from './pages/ExecutionsPage';
import { TasksPage } from './pages/TasksPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<Navigate to="/app/dashboard" replace />} />

          {/* Protected Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected App Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Requests */}
            <Route path="requests" element={<RequestsListPage />} />
            <Route path="requests/new" element={<NewRequestPage />} />
            <Route path="requests/:requestId" element={<RequestDetailPage />} />
            
            {/* Approvals */}
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="approvals/:approvalId" element={<ApprovalsPage />} />
            
            {/* Workflows */}
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="workflows/new" element={<WorkflowDesignerPage />} />
            <Route path="workflows/:workflowId" element={<WorkflowDesignerPage />} />
            
            {/* Executions */}
            <Route path="executions" element={<ExecutionsPage />} />
            <Route path="workflows/:workflowId/executions/:executionId" element={<ExecutionsPage />} />
            
            {/* Tasks */}
            <Route path="tasks" element={<TasksPage />} />
            
            {/* Documents */}
            <Route path="documents" element={<DocumentsPage />} />
            
            {/* Reports */}
            <Route path="reports" element={<ReportsPage />} />
            
            {/* Notifications */}
            <Route path="notifications" element={<NotificationsPage />} />
            
            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
