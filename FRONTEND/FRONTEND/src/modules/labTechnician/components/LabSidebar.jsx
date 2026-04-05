import AppSidebar from "../../../components/common/AppSidebar";

const navItems = [
  { label: "Dashboard", path: "/lab-technician", end: true },
  { label: "Lab Prescriptions", path: "/lab-technician/prescriptions" },
  { label: "Lab Reports", path: "/lab-technician/reports" },
  { label: "Lab Billing", path: "/lab-technician/billing" },
  { label: "Lab Tests", path: "/lab-technician/tests" },
];

export default function LabSidebar() {
  return (
    <AppSidebar
      title="LabTech Panel"
      subtitle="Clinic Management"
      navItems={navItems}
      loginPath="/login"
    />
  );
}