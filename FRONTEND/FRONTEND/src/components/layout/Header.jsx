import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { FaBars, FaTimes, FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className="border-b border-white/10 bg-slate-950 text-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-3 text-sm md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <div className="inline-flex items-center gap-2">
              <FaMapMarkerAlt className="text-blue-400" size={12} />
              <span>Trivandrum, Kerala</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <FaEnvelope className="text-blue-400" size={12} />
              <span>hospital@gmail.com</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2">
            <FaPhoneAlt className="text-blue-400" size={12} />
            <span>+91 9876543210</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-lg font-bold text-white shadow-md">
              C
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">CMS+</p>
              <p className="text-xs font-medium text-slate-500">
                Clinic Management System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <a
              href="#services"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive("/")
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Services
            </a>

            <a
              href="#"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Contact
            </a>

            <Link
              to="/login"
              className="ml-2 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Sign in
            </Link>
          </nav>

          <button
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4">
              <a
                href="#services"
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                Services
              </a>

              <a
                href="#"
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>

              <Link
                to="/login"
                className="mt-2 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;