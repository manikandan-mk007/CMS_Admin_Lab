import { Link } from "react-router-dom";
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt, FaArrowRight } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 font-bold text-white shadow-md">
                C
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">CMS+</h2>
                <p className="text-sm text-slate-400">Clinic Management System</p>
              </div>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              A modern platform for clinic administration, doctor workflows,
              lab management, reports, billing, and better care coordination.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Quick Links
            </h3>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link to="/" className="transition hover:text-white">
                Home
              </Link>
              <a href="#services" className="transition hover:text-white">
                Services
              </a>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 transition hover:text-white"
              >
                Sign in <FaArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Modules
            </h3>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
              <p>Admin Management</p>
              <p>Doctor Workflow</p>
              <p>Staff Operations</p>
              <p>Lab Technician Portal</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Contact
            </h3>
            <div className="mt-5 space-y-4 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="mt-1 text-blue-400" size={14} />
                <span>Trivandrum, Kerala</span>
              </div>

              <div className="flex items-start gap-3">
                <FaEnvelope className="mt-1 text-blue-400" size={14} />
                <span>hospital@gmail.com</span>
              </div>

              <div className="flex items-start gap-3">
                <FaPhoneAlt className="mt-1 text-blue-400" size={14} />
                <span>+91 9876543210</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          © 2026 CMS+. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;