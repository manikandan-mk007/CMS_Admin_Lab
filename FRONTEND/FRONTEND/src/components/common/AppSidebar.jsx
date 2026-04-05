import { NavLink, useNavigate } from "react-router-dom";

export default function AppSidebar({
  title = "Dashboard",
  subtitle = "",
  navItems = [],
  loginPath = "/login",
  onLogout,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    sessionStorage.clear();
    navigate(loginPath);
  };

  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-blue-800/40 bg-gradient-to-b from-slate-950 via-blue-950 to-blue-800 text-white shadow-2xl">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white backdrop-blur-sm">
            C
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-blue-100/80">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end ?? false}
            className={({ isActive }) =>
              `group block rounded-2xl px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white text-blue-700 shadow-lg"
                  : "text-blue-50 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <span className="flex items-center justify-between">
              <span>{item.label}</span>
              <span className="h-2 w-2 rounded-full bg-current opacity-0 transition group-hover:opacity-40" />
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.99]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}