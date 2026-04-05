import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { Link } from "react-router-dom";
import {
  FaUserMd,
  FaFlask,
  FaHospitalAlt,
  FaShieldAlt,
  FaClock,
  FaFileMedicalAlt,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";

const specialties = [
  {
    title: "Cardiology",
    description: "Advanced heart care with experienced specialists and modern diagnostics.",
    image:
      "https://images.unsplash.com/photo-1580281657527-47f249e8f4df?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Neurology",
    description: "Comprehensive neurological care for accurate diagnosis and treatment.",
    image:
      "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Orthopedics",
    description: "Focused bone, joint, and mobility care with patient-first treatment plans.",
    image:
      "https://tse4.mm.bing.net/th/id/OIP.sYbOZYAPvQLXUOKaAapKfwHaIA?w=964&h=1042&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    title: "Pediatrics",
    description: "Trusted healthcare services for infants, children, and adolescents.",
    image:
      "https://images.unsplash.com/photo-1600959907703-125ba1374a12?auto=format&fit=crop&w=1200&q=80",
  },
];

const highlights = [
  {
    icon: FaClock,
    title: "24/7 Support",
    desc: "Always available for urgent medical attention and patient assistance.",
  },
  {
    icon: FaUserMd,
    title: "Expert Doctors",
    desc: "Qualified doctors and specialists delivering confident clinical care.",
  },
  {
    icon: FaFlask,
    title: "Modern Lab Services",
    desc: "Fast, accurate testing workflows and timely diagnostic reporting.",
  },
  {
    icon: FaShieldAlt,
    title: "Secure Records",
    desc: "Role-based access and protected medical data across all departments.",
  },
];

const features = [
  "Centralized patient and staff management",
  "Reliable doctor, lab, and admin workflows",
  "Clear reporting, billing, and scheduling support",
  "Modern healthcare experience with responsive UI",
];

const stats = [
  { value: "20+", label: "Specialists" },
  { value: "10k+", label: "Patients Served" },
  { value: "99%", label: "Care Satisfaction" },
];

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1600&q=80"
              alt="Hospital"
              className="h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-blue-950/85 to-blue-700/70" />
          </div>

          <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8">
            <div className="max-w-2xl text-white">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                Smart Clinic Management Platform
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl xl:text-6xl">
                Better care starts with a better clinic system
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100 md:text-lg">
                Streamline appointments, records, lab workflows, staff
                operations, and billing with one modern clinic management
                experience.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get Started
                </Link>

                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-blue-700"
                >
                  Explore Services
                </a>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                  >
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-sm text-blue-100">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
                <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                        Clinic Overview
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">
                        Unified healthcare workflow
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                      <FaHospitalAlt size={22} />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {features.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="mt-0.5 text-emerald-500">
                          <FaCheckCircle size={18} />
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
                    <p className="text-sm text-blue-100">Role-based modules</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-medium">
                      <div className="rounded-xl bg-white/10 px-3 py-2">Admin</div>
                      <div className="rounded-xl bg-white/10 px-3 py-2">Doctor</div>
                      <div className="rounded-xl bg-white/10 px-3 py-2">Staff</div>
                      <div className="rounded-xl bg-white/10 px-3 py-2">Lab Technician</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="services" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Specialties
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
                Specialized care for every stage of treatment
              </h2>
              <p className="mt-4 text-slate-600">
                Designed to support modern clinic operations while delivering a
                patient-friendly healthcare experience.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {specialties.map((dept) => (
                <div
                  key={dept.title}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                >
                  <div className="overflow-hidden">
                    <img
                      src={dept.image}
                      alt={dept.title}
                      className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 transition group-hover:text-blue-600">
                      {dept.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {dept.description}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                      Learn more <FaArrowRight size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Why choose us
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
                Built for efficient clinics and confident care delivery
              </h2>
              <p className="mt-5 max-w-xl text-slate-600">
                From front desk operations to lab reporting and patient record
                handling, the platform helps teams work faster with fewer
                inconsistencies.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Consistent blue/slate product design across all screens",
                  "Structured modules for admin, doctors, staff, and lab teams",
                  "Reusable components for scalable frontend development",
                  "Clean layout with responsive cards, sections, and actions",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="mt-0.5 text-blue-600">
                      <FaCheckCircle size={18} />
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <FaFileMedicalAlt size={20} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Smart Records
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Maintain clear medical history, lab information, and billing
                  records in one place.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <FaUserMd size={20} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Better Coordination
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Support collaboration across doctors, staff, and technicians
                  with clear workflows.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                      Ready to begin?
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      Access your clinic workspace
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Sign in to manage patients, reports, schedules, and daily
                      clinic operations.
                    </p>
                  </div>

                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 py-20 text-white">
          <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              Start today
            </p>
            <h2 className="mt-4 text-3xl font-bold md:text-5xl">
              Modern clinic operations with one unified system
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-blue-100">
              Bring together administration, consultations, diagnostics, and
              reporting with a polished platform built for real healthcare
              teams.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Go to Login
              </Link>

              <a
                href="#services"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-blue-700"
              >
                View Services
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;