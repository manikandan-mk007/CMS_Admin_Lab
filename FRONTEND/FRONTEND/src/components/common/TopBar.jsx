import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const TopBar = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur-xl md:px-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {user?.first_name || user?.username || "User"}
        </h1>
      </div>

      <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
        {user?.role || "User"}
      </div>
    </div>
  );
};

export default TopBar;