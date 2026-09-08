import React from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { Navigate as Vendor_Navigate } from "react-router-dom";
import { Welcome } from "./pages/Welcome.jsx";
import { useCurrentUser } from "./context/AuthContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import { Routes as Vendor_Routes } from "react-router-dom";
import { Route as Vendor_Route } from "react-router-dom";
import { Login } from "./pages/Login.jsx";
import { DataVersionProvider } from "./context/DataVersionContext.jsx";
import { CatalogProvider } from "./context/CatalogContext.jsx";
import { OrgProvider } from "./context/OrgContext.jsx";
import { RequestModalProvider } from "./components/requests/RequestModalProvider.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { MyRequests } from "./pages/MyRequests.jsx";
import { canApprove } from "./utils/constants.jsx";
import { Approvals } from "./pages/Approvals.jsx";
import { TeamPage } from "./pages/TeamPage.jsx";
import { isGodAdmin } from "./utils/constants.jsx";
import { Profile } from "./pages/Profile.jsx";
import { DEMO_MODE } from "./data/dataSource.jsx";
export const Reports = React.lazy(() => import("./pages/Reports.jsx"));
export const Settings = React.lazy(() => import("./pages/Settings.jsx"));
export const Loading = () => (
  <div className="p-6 text-sm text-ink-mute">{"Loading…"}</div>
);
export function AuthGuard({ children: children }) {
  const { user: user, loading: loading } = useAuth();
  return loading ? (
    <div className="grid min-h-screen place-items-center bg-surface text-sm text-ink-mute">
      {"Loading…"}
    </div>
  ) : user ? (
    user.passwordSetupRequired ? (
      <Vendor_Navigate to="/welcome" replace={!0} />
    ) : (
      children
    )
  ) : (
    <Vendor_Navigate to="/login" replace={!0} />
  );
}
export function WelcomeRoute() {
  const { user: user, loading: loading } = useAuth();
  return loading ? (
    <div className="grid min-h-screen place-items-center bg-navy text-sm text-navy-fg-mute">
      {"Opening your account…"}
    </div>
  ) : user ? (
    user.passwordSetupRequired ? (
      <Welcome />
    ) : (
      <Vendor_Navigate to="/" replace={!0} />
    )
  ) : (
    <Welcome signInRequired={!0} />
  );
}
export function RoleGuard({ allow: allow, children: children }) {
  const n = useCurrentUser();
  return allow(n == null ? void 0 : n.role) ? (
    children
  ) : (
    <Vendor_Navigate to="/" replace={!0} />
  );
}
export function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <Vendor_Routes>
            <Vendor_Route path="/login" element={<Login />} />
            <Vendor_Route path="/welcome" element={<WelcomeRoute />} />
            <Vendor_Route
              element={
                <AuthGuard>
                  <DataVersionProvider>
                    <CatalogProvider>
                      <OrgProvider>
                        <RequestModalProvider>
                          <AppLayout />
                        </RequestModalProvider>
                      </OrgProvider>
                    </CatalogProvider>
                  </DataVersionProvider>
                </AuthGuard>
              }
            >
              <Vendor_Route index={!0} element={<Dashboard />} />
              <Vendor_Route path="calendar" element={<CalendarPage />} />
              <Vendor_Route path="requests" element={<MyRequests />} />
              <Vendor_Route
                path="approvals"
                element={
                  <RoleGuard allow={canApprove}>
                    <Approvals />
                  </RoleGuard>
                }
              />
              <Vendor_Route
                path="team"
                element={
                  <RoleGuard allow={canApprove}>
                    <TeamPage />
                  </RoleGuard>
                }
              />
              <Vendor_Route
                path="reports"
                element={
                  <RoleGuard allow={isGodAdmin}>
                    <React.Suspense fallback={<Loading />}>
                      <Reports />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Vendor_Route
                path="settings"
                element={
                  <RoleGuard allow={canApprove}>
                    <React.Suspense fallback={<Loading />}>
                      <Settings />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Vendor_Route path="profile" element={<Profile />} />
            </Vendor_Route>
            <Vendor_Route
              path="*"
              element={<Vendor_Navigate to="/" replace={!0} />}
            />
          </Vendor_Routes>
          {DEMO_MODE}
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  );
}
export function AppProvider({ children: children }) {
  return children;
}
