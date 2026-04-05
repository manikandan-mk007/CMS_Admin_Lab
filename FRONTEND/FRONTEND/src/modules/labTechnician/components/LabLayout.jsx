import { Outlet } from "react-router-dom";
import LabSidebar from "./LabSidebar";
import TopBar from "../../../components/common/TopBar";

export default function LabLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <LabSidebar />

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
}