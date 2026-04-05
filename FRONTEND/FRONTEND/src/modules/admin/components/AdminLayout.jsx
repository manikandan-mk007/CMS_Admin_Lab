import { Outlet, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import AppSidebar from "../../../components/common/AppSidebar";
import TopBar from "../../../components/common/TopBar";

const navItems = [
  { label: "Dashboard", path: "/admin", end: true },
  { label: "Staff", path: "/admin/staff" },
  { label: "Doctors", path: "/admin/doctors" },
  { label: "Schedules", path: "/admin/schedules" },
  { label: "Specializations", path: "/admin/specializations" },
  { label: "Settings", path: "/admin/settings" },
  { label: "Lab Tests", path: "/admin/lab-tests" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <AppSidebar
        title="Admin Panel"
        subtitle="Clinic Management"
        navItems={navItems}
        loginPath="/login"
        onLogout={handleLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;