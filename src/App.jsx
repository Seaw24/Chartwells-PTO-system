import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { RequestModalProvider } from './components/requests/RequestModalProvider.jsx';
import { useDemoContext } from './hooks/useDemoContext';
import { canApprove, isGodAdmin } from './utils/constants';
import AppLayout from './components/layout/AppLayout.jsx';
import DemoToolbar from './components/demo/DemoToolbar.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import MyRequests from './pages/MyRequests.jsx';
import Approvals from './pages/Approvals.jsx';
import TeamPage from './pages/TeamPage.jsx';
import Profile from './pages/Profile.jsx';

// Reports pulls in Recharts; load it on demand to keep the initial bundle small.
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const Loading = () => <div className="p-6 text-sm text-ink-mute">Loading…</div>;

function RoleGuard({ allow, children }) {
  const { activeUser } = useDemoContext();
  return allow(activeUser?.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <DemoProvider>
      <ToastProvider>
        <RequestModalProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="requests" element={<MyRequests />} />
              <Route
                path="approvals"
                element={<RoleGuard allow={canApprove}><Approvals /></RoleGuard>}
              />
              <Route path="team" element={<RoleGuard allow={canApprove}><TeamPage /></RoleGuard>} />
              <Route
                path="reports"
                element={<RoleGuard allow={isGodAdmin}><Suspense fallback={<Loading />}><Reports /></Suspense></RoleGuard>}
              />
              <Route
                path="settings"
                element={<RoleGuard allow={isGodAdmin}><Suspense fallback={<Loading />}><Settings /></Suspense></RoleGuard>}
              />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <DemoToolbar />
        </RequestModalProvider>
      </ToastProvider>
    </DemoProvider>
  );
}
