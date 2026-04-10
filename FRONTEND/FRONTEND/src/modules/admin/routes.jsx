import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StaffPage from "./pages/StaffPage";
import DoctorPage from "./pages/DoctorPage";
import AdminLayout from "./components/AdminLayout";
import HospitalSettings from "./pages/HospitalSettings";
import DoctorSchedule from "./pages/DoctorSchedule";
import LabTestsPage from "./pages/LabTestsPage";

const SafeRoute = ({ children }) => {
  return children ?? <div>Page not available</div>;
};

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<SafeRoute><AdminLayout /></SafeRoute>}>
        <Route index element={<SafeRoute><Dashboard /></SafeRoute>} />
        <Route path="staff" element={<SafeRoute><StaffPage /></SafeRoute>} />
        <Route path="doctors" element={<SafeRoute><DoctorPage /></SafeRoute>} />
        <Route
          path="settings"
          element={<SafeRoute><HospitalSettings /></SafeRoute>}
        />
        <Route
          path="schedules"
          element={<SafeRoute><DoctorSchedule /></SafeRoute>}
        />
        <Route
          path="lab-tests"
          element={<SafeRoute><LabTestsPage /></SafeRoute>}
        />

        {/* fallback for unknown admin routes */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;