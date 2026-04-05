import { useRef } from "react";
import PrintReport from "./PrintReport";

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
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

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-right text-sm font-medium text-slate-800">
      {value || "-"}
    </span>
  </div>
);

export default function ReportViewModal({ open, onClose, report, onDownloadPdf }) {
  const printRef = useRef(null);

  if (!open || !report) return null;

  const test = report.test_details || {};

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Lab Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: white;
            color: #111827;
            padding: 32px;
          }

          .print-report {
            max-width: 900px;
            margin: 0 auto;
          }

          .print-report__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }

          .print-report__eyebrow {
            font-size: 14px;
            color: #2563eb;
            font-weight: 700;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .print-report__title {
            font-size: 34px;
            margin: 0 0 8px 0;
          }

          .print-report__subtext {
            font-size: 16px;
            color: #475569;
          }

          .print-report__status-block {
            text-align: right;
          }

          .print-report__label {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 6px;
          }

          .print-report__status {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            font-weight: 700;
            text-transform: capitalize;
          }

          .print-report__cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }

          .print-report__card {
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 18px;
          }

          .print-report__card-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .print-report__row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
          }

          .print-report__row--last {
            border-bottom: none;
          }

          .print-report__section-title {
            font-size: 20px;
            font-weight: 700;
            margin: 24px 0 12px;
          }

          .print-report__table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          .print-report__table th,
          .print-report__table td {
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: left;
          }

          .print-report__table th {
            background: #eff6ff;
          }

          .print-report__remarks-box {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            min-height: 80px;
            background: #f8fafc;
          }

          .print-report__footer-note {
            margin-top: 24px;
            font-size: 13px;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
          }

          .font-strong {
            font-weight: 700;
          }

          .capitalize-cell {
            text-transform: capitalize;
          }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5 md:px-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Report Preview
            </p>
            <h3 className="text-2xl font-bold text-slate-900">View Report</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                {formatDisplayId("RP", report.id)}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium capitalize text-slate-700">
                {report.status || "-"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-4 text-lg font-bold text-slate-900">
                Report Summary
              </h4>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Row label="Report ID" value={formatDisplayId("RP", report.id)} />
                  <Row label="Prescription ID" value={formatDisplayId("PT", report.lab_prescription)} />
                  <Row label="Consultation ID" value={formatDisplayId("CT", report.consultation_id)} />
                  <Row label="Appointment ID" value={formatDisplayId("AP", report.appointment_id)} />
                  <Row label="Created At" value={formatDateTime(report.created_at)} />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Row label="Patient" value={report.patient_name} />
                  <Row label="Doctor" value={report.doctor_name} />
                  <Row label="Test Name" value={test.test_name} />
                  <Row label="Normal Range" value={formatRange(test)} />
                  <Row label="Result" value={report.result_value} />
                  <Row label="Abnormal" value={report.is_abnormal ? "Yes" : "No"} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-3 text-lg font-bold text-slate-900">Remarks</h4>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                {report.remarks || "No remarks"}
              </div>
            </div>

            <div className="hidden">
              <div ref={printRef}>
                <PrintReport report={report} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 md:px-8">
          <button
            onClick={handlePrint}
            className="rounded-2xl bg-slate-100 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Print
          </button>

          <button
            onClick={() => onDownloadPdf?.(report.id)}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}