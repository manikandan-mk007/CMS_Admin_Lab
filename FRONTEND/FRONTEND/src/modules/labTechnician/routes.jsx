import { Routes, Route, Navigate } from "react-router-dom";
import LabLayout from "./components/LabLayout";
import LabDashboardPage from "./pages/LabDashboardPage";
import LabPrescriptionsPage from "./pages/LabPrescriptionsPage";
import LabReportsPage from "./pages/LabReportsPage";
import LabBillingPage from "./pages/LabBillingPage";
import LabTestsPage from "./pages/LabTestsPage";

const RouteFallback = () => (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
    Failed to load page.
  </div>
);

const withRouteSafety = (element) => element || <RouteFallback />;

const LabTechnicianRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={withRouteSafety(<LabLayout />)}>
        <Route index element={withRouteSafety(<LabDashboardPage />)} />
        <Route
          path="prescriptions"
          element={withRouteSafety(<LabPrescriptionsPage />)}
        />
        <Route
          path="reports"
          element={withRouteSafety(<LabReportsPage />)}
        />
        <Route
          path="billing"
          element={withRouteSafety(<LabBillingPage />)}
        />
        <Route
          path="tests"
          element={withRouteSafety(<LabTestsPage />)}
        />
        <Route path="*" element={<Navigate to="/lab-technician" replace />} />
      </Route>
    </Routes>
  );
};

export default LabTechnicianRoutes;