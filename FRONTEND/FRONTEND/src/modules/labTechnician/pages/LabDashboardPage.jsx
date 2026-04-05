import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import {
  FaFlask,
  FaFileAlt,
  FaExclamationTriangle,
  FaMoneyBill,
  FaArrowRight,
} from "react-icons/fa";
import { labApi } from "../api/labApi";
import { showError } from "../utils/toast";

const formatINR = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

export default function LabDashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [statsRes, alertsRes] = await Promise.all([
        labApi.getDashboardStats(),
        labApi.getAbnormalAlerts(),
      ]);

      setStats(statsRes || null);
      setAlerts(alertsRes || []);
    } catch (err) {
      const message = err.message || "Failed to load dashboard";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const goToTests = () => navigate("/lab-technician/tests");
  const goToReports = () => navigate("/lab-technician/reports");
  const goToAbnormalReports = () =>
    navigate("/lab-technician/reports?status=complete&is_abnormal=true");
  const goToPaidBills = () =>
    navigate("/lab-technician/billing?payment_status=paid");

  const goToSpecificAlertReport = (alert) => {
    const params = new URLSearchParams({
      status: "complete",
      is_abnormal: "true",
      search: alert.patient_name || "",
    });

    navigate(`/lab-technician/reports?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Dashboard"
        subtitle="Overview of tests, reports, billing, and abnormal alerts"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
          Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={goToTests}
              className="rounded-3xl text-left transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <StatCard
                title="Total Tests"
                value={stats?.tests?.total ?? 0}
                subtitle={`Active: ${stats?.tests?.active ?? 0}`}
                icon={<FaFlask size={20} />}
              />
            </button>

            <button
              type="button"
              onClick={goToReports}
              className="rounded-3xl text-left transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <StatCard
                title="Total Reports"
                value={stats?.reports?.total ?? 0}
                subtitle={`Completed: ${stats?.reports?.completed ?? 0}`}
                icon={<FaFileAlt size={20} />}
              />
            </button>

            <button
              type="button"
              onClick={goToAbnormalReports}
              className="rounded-3xl text-left transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <StatCard
                title="Abnormal Reports"
                value={stats?.reports?.abnormal ?? 0}
                subtitle={`Pending: ${stats?.reports?.pending ?? 0}`}
                icon={<FaExclamationTriangle size={20} />}
              />
            </button>

            <button
              type="button"
              onClick={goToPaidBills}
              className="rounded-3xl text-left transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <StatCard
                title="Revenue"
                value={formatINR(stats?.billing?.revenue ?? 0)}
                subtitle={`Paid bills: ${stats?.billing?.paid ?? 0}`}
                icon={<FaMoneyBill size={20} />}
              />
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Abnormal Result Alerts
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Review completed abnormal reports that need attention.
                </p>
              </div>
            </div>

            {!alerts.length ? (
              <EmptyState message="No abnormal result alerts found." />
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => goToSpecificAlertReport(alert)}
                    className="w-full rounded-3xl border border-red-200 bg-red-50 p-5 text-left transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {alert.test_name} — {alert.patient_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Doctor: {alert.doctor_name}
                        </p>
                        <p className="mt-2 text-sm font-medium text-red-700">
                          Result: {alert.result_value} | Normal Range: {alert.normal_range}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Updated:{" "}
                          {alert.updated_at
                            ? new Date(alert.updated_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                          Abnormal
                        </span>

                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
                          View <FaArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-900">Top Tests</h3>
              <p className="mt-1 text-sm text-slate-500">
                Most frequently reported lab tests.
              </p>
            </div>

            {!stats?.top_tests?.length ? (
              <EmptyState message="No test statistics available yet." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-4 font-semibold">ID</th>
                      <th className="px-4 py-4 font-semibold">Test Name</th>
                      <th className="px-4 py-4 font-semibold">Report Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_tests.map((test) => (
                      <tr
                        key={test.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4 text-slate-700">{test.id}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {test.test_name}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {test.report_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}