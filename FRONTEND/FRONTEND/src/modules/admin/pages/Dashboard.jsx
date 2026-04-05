import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaUserMd,
  FaCalendarAlt,
  FaStethoscope,
  FaHospital,
  FaFlask,
  FaArrowRight,
} from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Staff Management",
      subtitle: "Create and update staff accounts",
      icon: <FaUsers size={26} />,
      path: "/admin/staff",
    },
    {
      title: "Doctors",
      subtitle: "Doctor profiles and assignments",
      icon: <FaUserMd size={26} />,
      path: "/admin/doctors",
    },
    {
      title: "Schedules",
      subtitle: "Doctor daily schedules",
      icon: <FaCalendarAlt size={26} />,
      path: "/admin/schedules",
    },
    {
      title: "Specializations",
      subtitle: "Medical specialization master data",
      icon: <FaStethoscope size={26} />,
      path: "/admin/specializations",
    },
    {
      title: "Settings",
      subtitle: "Hospital registration fee",
      icon: <FaHospital size={26} />,
      path: "/admin/settings",
    },
    {
      title: "Lab Tests",
      subtitle: "Admin-only lab test CRUD",
      icon: <FaFlask size={26} />,
      path: "/admin/lab-tests",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white shadow-xl md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Admin Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
          Manage staff, doctors, schedules, specializations, hospital settings,
          and lab tests from one unified workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => navigate(card.path)}
            className="group flex min-h-[160px] items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
              {card.icon}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {card.subtitle}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                Open module <FaArrowRight size={12} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;