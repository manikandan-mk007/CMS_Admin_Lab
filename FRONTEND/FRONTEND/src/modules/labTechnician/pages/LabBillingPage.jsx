import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import BillViewModal from "../components/BillViewModal";
import CustomDropdown from "../components/CustomDropdown";
import { labApi } from "../api/labApi";
import { showError, showSuccess, showInfo } from "../utils/toast";

const billingStatusOptions = [
  { value: "", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
];

const formatINR = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

export default function LabBillingPage() {
  const [searchParams] = useSearchParams();

  const [billings, setBillings] = useState([]);
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("payment_status") || ""
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBillings = async () => {
    try {
      setLoading(true);
      setError("");

      const [billingRes, reportRes, prescriptionRes] = await Promise.all([
        labApi.getLabBillings(),
        labApi.getLabReports({ detailed: "true" }),
        labApi.getLabPrescriptions(),
      ]);

      setBillings(billingRes.items || []);
      setReports(reportRes.items || []);
      setPrescriptions(prescriptionRes.items || []);
    } catch (err) {
      const message = err.message || "Failed to load billings";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillings();
  }, []);

  useEffect(() => {
    setStatusFilter(searchParams.get("payment_status") || "");
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [success]);

  const consultationPrescriptionMap = useMemo(() => {
    const map = new Map();

    prescriptions.forEach((item) => {
      const consultationId = item.consultation_id;
      const testName = item.lab_test_name;

      if (!consultationId) return;

      if (!map.has(consultationId)) {
        map.set(consultationId, {
          testNames: new Set(),
          prescriptionIds: new Set(),
        });
      }

      const entry = map.get(consultationId);

      if (item.id !== null && item.id !== undefined) {
        entry.prescriptionIds.add(String(item.id));
      }

      if (testName) {
        entry.testNames.add(testName);
      }
    });

    return map;
  }, [prescriptions]);

  const consultationCompletedMap = useMemo(() => {
    const map = new Map();

    reports.forEach((report) => {
      const consultationId = report.consultation_id;
      const prescriptionId = report.lab_prescription;

      if (!consultationId || !prescriptionId) return;

      if (!map.has(consultationId)) {
        map.set(consultationId, new Set());
      }

      if (report.status === "complete") {
        map.get(consultationId).add(String(prescriptionId));
      }
    });

    return map;
  }, [reports]);

  const billingRows = useMemo(() => {
    return billings.map((bill) => {
      const prescriptionEntry = consultationPrescriptionMap.get(bill.consultation);
      const completedSet = consultationCompletedMap.get(bill.consultation);

      const totalPrescribedTests = prescriptionEntry
        ? prescriptionEntry.prescriptionIds.size
        : 0;

      const completedTests = completedSet ? completedSet.size : 0;

      const testNames = prescriptionEntry
        ? Array.from(prescriptionEntry.testNames).join(", ")
        : "-";

      const allReportsCompleted =
        totalPrescribedTests > 0 && completedTests >= totalPrescribedTests;

      return {
        ...bill,
        display_bill_id: formatDisplayId("BL", bill.id),
        display_consultation_id: formatDisplayId("CT", bill.consultation),
        test_names: testNames,
        total_prescribed_tests: totalPrescribedTests,
        completed_tests: completedTests,
        can_mark_paid: allReportsCompleted,
      };
    });
  }, [billings, consultationPrescriptionMap, consultationCompletedMap]);

  const filteredBillings = useMemo(() => {
    return billingRows.filter((bill) => {
      const consultationId = String(bill.consultation || "");
      const displayConsultationId = (bill.display_consultation_id || "").toLowerCase();
      const displayBillId = (bill.display_bill_id || "").toLowerCase();
      const patientName = (bill.consultation_details?.patient || "").toLowerCase();
      const doctorName = (bill.consultation_details?.doctor || "").toLowerCase();
      const testNames = (bill.test_names || "").toLowerCase();
      const query = search.toLowerCase();

      const matchesSearch =
        patientName.includes(query) ||
        doctorName.includes(query) ||
        consultationId.includes(search) ||
        displayConsultationId.includes(query) ||
        displayBillId.includes(query) ||
        testNames.includes(query);

      const matchesStatus = statusFilter
        ? bill.payment_status === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [billingRows, search, statusFilter]);

  const handleMarkPaid = async (bill) => {
    if (!bill.can_mark_paid) {
      showInfo(
        `Complete all lab reports first. ${bill.completed_tests}/${bill.total_prescribed_tests} completed.`
      );
      return;
    }

    try {
      setError("");
      setSuccess("");
      await labApi.markBillPaid(bill.id);
      setSuccess("Bill marked as paid");
      showSuccess("Bill marked as paid");
      await loadBillings();

      if (selectedBill?.id === bill.id) {
        const detail = await labApi.getLabBillingDetail(bill.id);
        setSelectedBill(detail);
      }
    } catch (err) {
      const message = err.message || "Failed to mark bill paid";
      setError(message);
      showError(message);
    }
  };

  const handleViewBill = async (id) => {
    try {
      setError("");
      setDetailLoading(true);
      const detail = await labApi.getLabBillingDetail(id);
      setSelectedBill(detail);
      setBillModalOpen(true);
    } catch (err) {
      const message = err.message || "Failed to load bill details";
      setError(message);
      showError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadBill = async (id) => {
    try {
      setError("");
      await labApi.downloadLabBillingPdf(id);
      showSuccess("Bill PDF downloaded successfully.");
    } catch (err) {
      const message = err.message || "Failed to download bill PDF";
      setError(message);
      showError(message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Billing"
        subtitle="View auto-generated billing and update payment status"
      />

      {success ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            Billing Records
          </h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill, patient, doctor, test..."
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
            />

            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={billingStatusOptions}
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading billings...
          </div>
        ) : !filteredBillings.length ? (
          <EmptyState message="No billing records found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-4 font-semibold">Bill ID</th>
                  <th className="px-4 py-4 font-semibold">Consultation</th>
                  <th className="px-4 py-4 font-semibold">Patient</th>
                  <th className="px-4 py-4 font-semibold">Doctor</th>
                  <th className="px-4 py-4 font-semibold">Tests</th>
                  <th className="px-4 py-4 font-semibold">Amount</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Progress</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredBillings.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {bill.display_bill_id}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {bill.display_consultation_id}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {bill.consultation_details?.patient || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {bill.consultation_details?.doctor || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {bill.test_names || "-"}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {formatINR(bill.total_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={bill.payment_status} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {bill.completed_tests}/{bill.total_prescribed_tests || 0} complete
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewBill(bill.id)}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          View
                        </button>

                        {bill.payment_status !== "paid" ? (
                          <button
                            onClick={() => handleMarkPaid(bill)}
                            disabled={!bill.can_mark_paid}
                            className="rounded-xl bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            title={
                              !bill.can_mark_paid
                                ? "Complete all reports for this consultation first"
                                : ""
                            }
                          >
                            Mark Paid
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleDownloadBill(bill.id)}
                          className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BillViewModal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        bill={selectedBill}
        onDownloadPdf={handleDownloadBill}
      />

      {detailLoading ? (
        <div className="fixed bottom-4 right-4 rounded-xl bg-blue-600 px-4 py-2 text-white shadow-lg">
          Loading bill details...
        </div>
      ) : null}
    </div>
  );
}