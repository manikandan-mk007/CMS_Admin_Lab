import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import CustomDropdown from "../components/CustomDropdown";
import { labApi } from "../api/labApi";
import { showError } from "../utils/toast";

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const formatINR = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

export default function LabTestsPage() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTests = async () => {
    try {
      setLoading(true);
      setError("");

      const { items } = await labApi.getLabTests();
      setTests(items || []);
    } catch (err) {
      const message = err.message || "Failed to load lab tests";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const matchesSearch =
        (test.test_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (test.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter ? test.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Lab Tests" subtitle="View available lab tests" />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-slate-900">All Lab Tests</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search test..."
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
            />

            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading tests...
          </div>
        ) : !filteredTests.length ? (
          <EmptyState message="No lab tests found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[860px] table-fixed text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="w-[100px] px-4 py-4 pr-4 font-semibold">Test ID</th>
                  <th className="w-[220px] py-4 pr-4 font-semibold">Name</th>
                  <th className="w-[220px] py-4 pr-4 font-semibold">Description</th>
                  <th className="w-[160px] py-4 pr-4 font-semibold">Range</th>
                  <th className="w-[120px] py-4 pr-4 font-semibold">Price</th>
                  <th className="w-[120px] py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTests.map((test) => (
                  <tr
                    key={test.id}
                    className="border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-4 py-4 pr-4 font-semibold text-slate-800">
                      {formatDisplayId("LT", test.id)}
                    </td>

                    <td className="py-4 pr-4">
                      <p className="break-words font-semibold text-slate-900">
                        {test.test_name}
                      </p>
                    </td>

                    <td className="py-4 pr-4">
                      <p className="break-words text-sm text-slate-500">
                        {test.description || "-"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap py-4 pr-4 text-slate-700">
                      {`${test.min_range} - ${test.max_range}`}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-4 text-slate-700">
                      {formatINR(test.price)}
                    </td>

                    <td className="whitespace-nowrap py-4">
                      <StatusBadge status={test.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}