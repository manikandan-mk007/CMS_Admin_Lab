import { forwardRef } from "react";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatRange = (test) => {
  if (
    test?.min_range === null ||
    test?.min_range === undefined ||
    test?.max_range === null ||
    test?.max_range === undefined
  ) {
    return "-";
  }
  return `${test.min_range} - ${test.max_range}`;
};

const PrintReport = forwardRef(function PrintReport({ report }, ref) {
  if (!report) return null;

  const test = report.test_details || {};

  return (
    <div ref={ref} className="print-report">
      <div className="print-report__header">
        <div>
          <div className="print-report__eyebrow">Laboratory Report</div>
          <h1 className="print-report__title">Lab Report</h1>
          <div className="print-report__subtext">
            Report ID: {formatDisplayId("RP", report.id)}
          </div>
        </div>

        <div className="print-report__status-block">
          <div className="print-report__label">Status</div>
          <div className="print-report__status">
            {report.status || "-"}
          </div>
        </div>
      </div>

      <div className="print-report__cards">
        <div className="print-report__card">
          <div className="print-report__card-title">Visit Details</div>

          <div className="print-report__row">
            <span>Consultation ID</span>
            <strong>{formatDisplayId("CT", report.consultation_id)}</strong>
          </div>

          <div className="print-report__row">
            <span>Appointment ID</span>
            <strong>{formatDisplayId("AP", report.appointment_id)}</strong>
          </div>

          <div className="print-report__row print-report__row--last">
            <span>Created At</span>
            <strong>{formatDateTime(report.created_at)}</strong>
          </div>
        </div>

        <div className="print-report__card">
          <div className="print-report__card-title">Patient & Doctor</div>

          <div className="print-report__row">
            <span>Patient</span>
            <strong>{report.patient_name || "-"}</strong>
          </div>

          <div className="print-report__row">
            <span>Doctor</span>
            <strong>{report.doctor_name || "-"}</strong>
          </div>

          <div className="print-report__row print-report__row--last">
            <span>Abnormal</span>
            <strong>{report.is_abnormal ? "Yes" : "No"}</strong>
          </div>
        </div>
      </div>

      <div className="print-report__section-title">Test Details</div>

      <table className="print-report__table">
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Normal Range</th>
            <th>Result</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="font-strong">{test.test_name || "-"}</td>
            <td>{formatRange(test)}</td>
            <td>{formatValue(report.result_value)}</td>
            <td className="capitalize-cell">{report.status || "-"}</td>
          </tr>
        </tbody>
      </table>

      <div className="print-report__remarks">
        <div className="print-report__section-title">Remarks</div>
        <div className="print-report__remarks-box">
          {report.remarks || "No remarks"}
        </div>
      </div>

      <div className="print-report__footer-note">
        This is a system-generated laboratory report.
      </div>
    </div>
  );
});

export default PrintReport;