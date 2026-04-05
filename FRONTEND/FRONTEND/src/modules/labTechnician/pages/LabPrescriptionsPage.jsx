import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import CustomDropdown from "../components/CustomDropdown";
import { labApi } from "../api/labApi";
import { showError, showInfo } from "../utils/toast";

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

export default function LabPrescriptionsPage() {
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [prescriptionRes, reportRes, testRes] = await Promise.all([
        labApi.getLabPrescriptions(),
        labApi.getLabReports(),
        labApi.getLabTests(),
      ]);

      setPrescriptions(prescriptionRes.items || []);
      setReports(reportRes.items || []);
      setLabTests(testRes.items || []);
    } catch (err) {
      const message = err.message || "Failed to load prescriptions";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const prescriptionReportMap = useMemo(() => {
    const map = new Map();

    reports.forEach((report) => {
      const key = String(report.lab_prescription);
      const currentStatus = map.get(key);

      if (!currentStatus) {
        map.set(key, report.status);
        return;
      }

      if (report.status === "complete") {
        map.set(key, "complete");
      }
    });

    return map;
  }, [reports]);

  const labTestMap = useMemo(() => {
    const map = new Map();

    labTests.forEach((test) => {
      map.set(String(test.id), test);
    });

    return map;
  }, [labTests]);

  const rows = useMemo(() => {
    return prescriptions.map((item) => {
      const reportStatus = prescriptionReportMap.get(String(item.id));
      const matchedTest = labTestMap.get(String(item.lab_test));

      const testExists = Boolean(matchedTest);
      const testIsActive = matchedTest?.status === "active";

      let generateReason = "";
      let canGenerateReport = false;
      let finalStatus = "pending";

      if (reportStatus === "complete") {
        finalStatus = "completed";
        generateReason = "Report already created";
      } else {
        finalStatus = "pending";

        if (!testExists) {
          generateReason = "Test not available";
        } else if (!testIsActive) {
          generateReason = "Inactive test";
        } else {
          canGenerateReport = true;
        }
      }

      return {
        ...item,
        report_status: finalStatus,
        can_generate_report: canGenerateReport,
        generate_reason: generateReason,
      };
    });
  }, [prescriptions, prescriptionReportMap, labTestMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const patient = (item.patient_name || "").toLowerCase();
      const doctor = (item.doctor_name || "").toLowerCase();
      const test = (item.lab_test_name || "").toLowerCase();
      const consultationId = String(item.consultation_id || "");
      const prescriptionId = String(item.id || "");
      const displayConsultationId = formatDisplayId("CT", item.consultation_id).toLowerCase();
      const displayPrescriptionId = formatDisplayId("PT", item.id).toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch =
        patient.includes(q) ||
        doctor.includes(q) ||
        test.includes(q) ||
        consultationId.includes(q) ||
        prescriptionId.includes(q) ||
        displayConsultationId.includes(q) ||
        displayPrescriptionId.includes(q);

      const matchesStatus =
        statusFilter === "all" ? true : item.report_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const handleGenerateReport = (item) => {
    if (!item.can_generate_report) {
      showInfo(item.generate_reason || "Cannot generate report");
      return;
    }

    const matchedTest = labTestMap.get(String(item.lab_test));

    const params = new URLSearchParams({
      prescription: item.id,
      consultation: item.consultation_id,
      test: item.lab_test,
      patient: item.patient_name || "",
      doctor: item.doctor_name || "",
      test_name: item.lab_test_name || "",
      min_range:
        matchedTest?.min_range !== null && matchedTest?.min_range !== undefined
          ? matchedTest.min_range
          : "",
      max_range:
        matchedTest?.max_range !== null && matchedTest?.max_range !== undefined
          ? matchedTest.max_range
          : "",
    });

    navigate(`/lab-technician/reports?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Prescriptions"
        subtitle="Doctor orders for the lab technician workflow"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            Doctor Orders
          </h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, doctor, test, consultation..."
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
            Loading prescriptions...
          </div>
        ) : !filteredRows.length ? (
          <EmptyState message="No prescriptions found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-4 font-semibold">Prescription</th>
                  <th className="py-4 font-semibold">Consultation</th>
                  <th className="py-4 font-semibold">Patient</th>
                  <th className="py-4 font-semibold">Doctor</th>
                  <th className="py-4 font-semibold">Test</th>
                  <th className="py-4 font-semibold">Status</th>
                  <th className="py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {formatDisplayId("PT", item.id)}
                    </td>

                    <td className="py-4 text-slate-700">
                      {formatDisplayId("CT", item.consultation_id)}
                    </td>

                    <td className="py-4 text-slate-700">
                      {item.patient_name || "-"}
                    </td>

                    <td className="py-4 text-slate-700">
                      {item.doctor_name || "-"}
                    </td>

                    <td className="py-4 text-slate-700">
                      {item.lab_test_name || "-"}
                    </td>

                    <td className="py-4">
                      <StatusBadge status={item.report_status} />
                    </td>

                    <td className="py-4">
                      <button
                        onClick={() => handleGenerateReport(item)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                        disabled={!item.can_generate_report}
                      >
                        Generate Report
                      </button>
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