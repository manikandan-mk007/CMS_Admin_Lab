import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import ReportViewModal from "../components/ReportViewModal";
import CustomDropdown from "../components/CustomDropdown";
import { labApi } from "../api/labApi";
import { showError, showSuccess } from "../utils/toast";

const getInitialForm = (searchParams) => ({
  lab_prescription: searchParams.get("prescription") || "",
  test: searchParams.get("test") || "",
  result_value: "",
  remarks: "",
  status: "pending",
});

const createStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "complete", label: "Complete" },
];

const reportStatusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "complete", label: "Complete" },
];

const abnormalOptions = [
  { value: "", label: "All Results" },
  { value: "true", label: "Abnormal Only" },
  { value: "false", label: "Normal Only" },
];

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

const extractApiError = (err) => {
  const data = err?.response?.data || err?.responseData;

  if (!data) {
    return {
      message: err.message || "Something went wrong.",
      fieldErrors: {},
    };
  }

  const fieldErrors = {};
  let message = "";

  Object.entries(data).forEach(([key, value]) => {
    const text = Array.isArray(value) ? value.join(" ") : String(value);

    if (key === "detail" || key === "message") {
      message = message ? `${message} ${text}` : text;
    } else {
      fieldErrors[key] = text;
      if (key === "non_field_errors" && !message) {
        message = text;
      }
    }
  });

  if (!message && Object.keys(fieldErrors).length > 0) {
    message = "Please fix the highlighted fields.";
  }

  return { message, fieldErrors };
};

export default function LabReportsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [tests, setTests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState(getInitialForm(searchParams));
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [abnormalFilter, setAbnormalFilter] = useState(searchParams.get("is_abnormal") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const validationTimers = useRef({});
  const latestRequestRef = useRef({});

  const selectedPatient = searchParams.get("patient");
  const selectedDoctor = searchParams.get("doctor");
  const selectedTestName = searchParams.get("test_name");
  const selectedPrescriptionId = searchParams.get("prescription");
  const selectedConsultationId = searchParams.get("consultation");

  const isPrescriptionFlow = Boolean(selectedPrescriptionId);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [reportsRes, testsRes] = await Promise.all([
        labApi.getLabReports({ detailed: "true" }),
        labApi.getLabTests(),
      ]);

      setReports(reportsRes.items || []);
      setTests(testsRes.items || []);
    } catch (err) {
      const message = err.message || "Failed to load reports";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (consultationId) => {
    if (!consultationId) {
      setSummary(null);
      return;
    }

    try {
      setSummaryLoading(true);
      const data = await labApi.getConsultationLabSummary(consultationId);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(getInitialForm(searchParams));
    setStatusFilter(searchParams.get("status") || "");
    setAbnormalFilter(searchParams.get("is_abnormal") || "");
    setSearch(searchParams.get("search") || "");
    setFieldErrors({});
    loadSummary(selectedConsultationId);
  }, [searchParams, selectedConsultationId]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    return () => {
      Object.values(validationTimers.current).forEach(clearTimeout);
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        (report.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.doctor_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.test_details?.test_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.remarks || "").toLowerCase().includes(search.toLowerCase()) ||
        formatDisplayId("RP", report.id).toLowerCase().includes(search.toLowerCase()) ||
        formatDisplayId("PT", report.lab_prescription).toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter ? report.status === statusFilter : true;

      const matchesAbnormal =
        abnormalFilter === ""
          ? true
          : String(report.is_abnormal) === abnormalFilter;

      return matchesSearch && matchesStatus && matchesAbnormal;
    });
  }, [reports, search, statusFilter, abnormalFilter]);

  const validateLocalField = (name, value) => {
    switch (name) {
      case "result_value":
        if (value === "") return "Result value is required.";
        if (Number.isNaN(Number(value))) return "Result value must be a valid number.";
        return "";
      case "remarks":
        if (!String(value).trim()) return "Remarks are required.";
        return "";
      default:
        return "";
    }
  };

  const extractFieldMessage = (field, err) => {
    const data = err?.response?.data || err?.responseData || {};
    const value = data?.[field];

    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === "string") return value;
    if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
      return data.non_field_errors[0];
    }
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.detail === "string") return data.detail;
    return "";
  };

  const runBackendFieldValidation = async (field, value, nextForm) => {
    if (typeof labApi?.validateLabReportField !== "function") return;

    const requestId = Date.now() + Math.random();
    latestRequestRef.current[field] = requestId;

    try {
      const payload = {
        ...nextForm,
        result_value:
          nextForm.result_value === "" ? "" : Number(nextForm.result_value),
        remarks: String(nextForm.remarks || "").trim(),
      };

      const result = await labApi.validateLabReportField({
        field,
        value: field === "result_value" && value !== "" ? Number(value) : value,
        form: payload,
      });

      if (latestRequestRef.current[field] !== requestId) return;

      setFieldErrors((prev) => ({
        ...prev,
        [field]: result?.ok === false ? result?.message || "" : "",
      }));
    } catch (err) {
      if (latestRequestRef.current[field] !== requestId) return;

      const message = extractFieldMessage(field, err);

      setFieldErrors((prev) => ({
        ...prev,
        [field]: message,
      }));
    }
  };

  const scheduleFieldValidation = (field, value, nextForm) => {
    const localError = validateLocalField(field, value);

    setFieldErrors((prev) => ({
      ...prev,
      [field]: localError,
    }));

    if (validationTimers.current[field]) {
      clearTimeout(validationTimers.current[field]);
    }

    if (localError) return;

    validationTimers.current[field] = setTimeout(() => {
      runBackendFieldValidation(field, value, nextForm);
    }, 400);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const nextForm = {
      ...form,
      [name]: value,
    };

    setForm(nextForm);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (name === "result_value" || name === "remarks") {
      scheduleFieldValidation(name, value, nextForm);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (name !== "result_value" && name !== "remarks") return;

    const nextForm = {
      ...form,
      [name]: value,
    };

    if (validationTimers.current[name]) {
      clearTimeout(validationTimers.current[name]);
    }

    const localError = validateLocalField(name, value);

    setFieldErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    if (!localError) {
      runBackendFieldValidation(name, value, nextForm);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (form.result_value === "") {
      setError("Result value is required.");
      setFieldErrors({ result_value: "Result value is required." });
      showError("Result value is required.");
      return;
    }

    if (!form.remarks.trim()) {
      setError("Remarks are required.");
      setFieldErrors({ remarks: "Remarks are required." });
      showError("Remarks are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

      await labApi.createLabReport({
        ...form,
        result_value: Number(form.result_value),
        remarks: form.remarks.trim(),
      });

      const createdAsComplete = form.status === "complete";
      const successMessage = createdAsComplete
        ? "Report created successfully. Billing updated."
        : "Report created successfully.";

      setSuccess(successMessage);
      showSuccess(successMessage);

      await loadData();
      if (selectedConsultationId) {
        await loadSummary(selectedConsultationId);
      }

      setForm(getInitialForm(searchParams));
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      const errorMessage = message || "Failed to create report";
      setError(errorMessage);
      setFieldErrors(fieldErrors || {});
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTestDetails = useMemo(() => {
    if (!form.test) return null;
    return tests.find((item) => String(item.id) === String(form.test)) || null;
  }, [tests, form.test]);

  const queryMinRange = searchParams.get("min_range");
  const queryMaxRange = searchParams.get("max_range");

  const resultPlaceholder =
    queryMinRange && queryMaxRange
      ? `Result value (${queryMinRange} - ${queryMaxRange})`
      : selectedTestDetails
      ? `Result value (${selectedTestDetails.min_range} - ${selectedTestDetails.max_range})`
      : "Result value";

  const handleMarkComplete = async (id) => {
    try {
      setError("");
      setSuccess("");

      await labApi.markReportComplete(id);

      const successMessage = "Report marked complete. Billing updated.";
      setSuccess(successMessage);
      showSuccess(successMessage);

      await loadData();
      if (selectedConsultationId) {
        await loadSummary(selectedConsultationId);
      }
    } catch (err) {
      const { message } = extractApiError(err);
      const errorMessage = message || "Failed to mark report complete";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      setError("");
      await labApi.downloadLabReportPdf(id);
      showSuccess("PDF downloaded successfully.");
    } catch (err) {
      const { message } = extractApiError(err);
      const errorMessage = message || "Failed to download PDF";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleViewReport = async (id) => {
    try {
      setError("");
      setDetailLoading(true);
      const detail = await labApi.getLabReportDetail(id);
      setSelectedReport(detail);
      setReportModalOpen(true);
    } catch (err) {
      const { message } = extractApiError(err);
      const errorMessage = message || "Failed to load report details";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Lab Reports"
        subtitle="Generate reports from doctor prescriptions and manage results"
      />

      {success ? (
        <div className="bg-blue-100 text-blue-700 px-4 py-3 rounded-xl mb-4">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      ) : null}

      {isPrescriptionFlow ? (
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-6 mb-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">
            Selected Prescription
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Prescription</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatDisplayId("PT", selectedPrescriptionId)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Consultation</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatDisplayId("CT", selectedConsultationId)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Patient</p>
              <p className="text-lg font-semibold text-slate-800">
                {selectedPatient || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Doctor</p>
              <p className="text-lg font-semibold text-slate-800">
                {selectedDoctor || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Test</p>
              <p className="text-lg font-semibold text-slate-800">
                {selectedTestName || "-"}
              </p>
            </div>
          </div>

          {summaryLoading ? (
            <div className="text-blue-700 font-medium">Loading consultation summary...</div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-slate-500">Total Tests</p>
                <p className="text-lg font-semibold text-slate-800">{summary.total_tests}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-lg font-semibold text-slate-800">{summary.completed_tests}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-lg font-semibold text-slate-800">{summary.pending_tests}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-slate-500">Abnormal</p>
                <p className="text-lg font-semibold text-slate-800">{summary.abnormal_results}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {isPrescriptionFlow ? (
          <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-6 self-start h-fit">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              Create Report
            </h3>

            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <input
                  type="text"
                  value={formatDisplayId("PT", form.lab_prescription)}
                  readOnly
                  className="w-full rounded-xl border border-blue-200 bg-slate-50 px-4 py-3"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={selectedTestName || ""}
                  readOnly
                  className="w-full rounded-xl border border-blue-200 bg-slate-50 px-4 py-3"
                />
              </div>

              <div>
                <input
                  type="number"
                  name="result_value"
                  value={form.result_value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={resultPlaceholder}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 outline-none focus:border-blue-500"
                />
                {fieldErrors.result_value ? (
                  <p className="text-sm text-red-500 mt-1">{fieldErrors.result_value}</p>
                ) : null}
              </div>

              <div>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Remarks"
                  rows={5}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 outline-none focus:border-blue-500"
                />
                {fieldErrors.remarks ? (
                  <p className="text-sm text-red-500 mt-1">{fieldErrors.remarks}</p>
                ) : null}
              </div>

              <CustomDropdown
                value={form.status}
                onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                options={createStatusOptions}
                fullWidth
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-medium hover:bg-blue-700 disabled:bg-slate-300"
              >
                {submitting ? "Saving..." : "Create Report"}
              </button>
            </form>
          </div>
        ) : null}

        <div className={`${isPrescriptionFlow ? "xl:col-span-2" : "xl:col-span-3"} bg-white rounded-2xl shadow-md border border-blue-100 p-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
            <h3 className="text-xl font-semibold text-slate-800">
              Reports
            </h3>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, doctor, report..."
                className="rounded-2xl border border-blue-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              />

              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={reportStatusOptions}
              />

              <CustomDropdown
                value={abnormalFilter}
                onChange={setAbnormalFilter}
                options={abnormalOptions}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-blue-700 font-medium">Loading reports...</div>
          ) : !filteredReports.length ? (
            <EmptyState message="No reports found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-blue-100 text-slate-600">
                    <th className="py-3">Report</th>
                    <th className="py-3">Patient</th>
                    <th className="py-3">Doctor</th>
                    <th className="py-3">Test</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Result</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100">
                      <td className="py-4 font-medium text-slate-800">
                        {formatDisplayId("RP", report.id)}
                      </td>
                      <td className="py-4">{report.patient_name || "-"}</td>
                      <td className="py-4">{report.doctor_name || "-"}</td>
                      <td className="py-4">{report.test_details?.test_name || "-"}</td>
                      <td className="py-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="py-4">{report.result_value ?? "-"}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-200"
                          >
                            View
                          </button>

                          {report.status !== "complete" ? (
                            <button
                              onClick={() => handleMarkComplete(report.id)}
                              className="rounded-xl bg-green-100 text-green-700 px-3 py-2 text-sm font-medium hover:bg-green-200"
                            >
                              Complete
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleDownloadPdf(report.id)}
                            className="rounded-xl bg-blue-100 text-blue-700 px-3 py-2 text-sm font-medium hover:bg-blue-200"
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
      </div>

      <ReportViewModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        report={selectedReport}
        onDownloadPdf={handleDownloadPdf}
      />

      {detailLoading ? (
        <div className="fixed bottom-4 right-4 rounded-xl bg-blue-600 text-white px-4 py-2 shadow-lg">
          Loading report details...
        </div>
      ) : null}
    </>
  );
}