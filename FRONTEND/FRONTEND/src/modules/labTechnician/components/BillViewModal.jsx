import { useRef } from "react";
import PrintBill from "./PrintBill";

const formatINR = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
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
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-right text-sm font-medium text-slate-800">
      {value || "-"}
    </span>
  </div>
);

export default function BillViewModal({ open, onClose, bill, onDownloadPdf }) {
  const printRef = useRef(null);

  if (!open || !bill) return null;

  const consultation = bill.consultation || {};
  const patient = consultation.patient || {};
  const doctor = consultation.doctor || {};
  const appointment = consultation.appointment || {};
  const labTests = bill.lab_tests || [];

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Lab Billing Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: white;
            color: #111827;
            padding: 32px;
          }

          .print-bill {
            max-width: 900px;
            margin: 0 auto;
          }

          .print-bill__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }

          .print-bill__eyebrow {
            font-size: 14px;
            color: #2563eb;
            font-weight: 700;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .print-bill__title {
            font-size: 34px;
            margin: 0 0 8px 0;
          }

          .print-bill__subtext {
            font-size: 16px;
            color: #475569;
          }

          .print-bill__status-block {
            text-align: right;
          }

          .print-bill__label {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 6px;
          }

          .print-bill__status {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            font-weight: 700;
            text-transform: capitalize;
          }

          .print-bill__cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }

          .print-bill__card {
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 18px;
          }

          .print-bill__card-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .print-bill__row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
          }

          .print-bill__row--last {
            border-bottom: none;
          }

          .print-bill__section-title {
            font-size: 20px;
            font-weight: 700;
            margin: 24px 0 12px;
          }

          .print-bill__table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          .print-bill__table th,
          .print-bill__table td {
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: left;
          }

          .print-bill__table th {
            background: #eff6ff;
          }

          .print-bill__footer-note {
            margin-top: 24px;
            font-size: 13px;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
          }

          .tfoot-label {
            font-weight: 700;
            text-align: right;
          }

          .tfoot-value {
            font-weight: 700;
          }

          .align-right {
            text-align: right;
          }

          .font-strong {
            font-weight: 700;
          }

          .capitalize-cell {
            text-transform: capitalize;
          }

          .empty-cell {
            text-align: center;
            color: #64748b;
            padding: 16px;
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
              Billing Receipt
            </p>
            <h3 className="text-2xl font-bold text-slate-900">View Bill</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                {formatDisplayId("BL", bill.id)}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium capitalize text-slate-700">
                {bill.payment_status || "-"}
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
                Billing Summary
              </h4>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Row label="Billing ID" value={formatDisplayId("BL", bill.id)} />
                  <Row label="Consultation ID" value={formatDisplayId("CT", consultation.id)} />
                  <Row label="Appointment ID" value={formatDisplayId("AP", appointment.id)} />
                  <Row label="Created At" value={formatDateTime(bill.created_at)} />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Row label="Patient" value={patient.name} />
                  <Row label="Doctor" value={doctor.name} />
                  <Row label="Payment Status" value={bill.payment_status} />
                  <Row label="Total Amount" value={formatINR(bill.total_amount)} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-4 text-lg font-bold text-slate-900">
                Test Items
              </h4>

              {!labTests.length ? (
                <p className="text-slate-500">No lab items found.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="px-4 py-4 font-semibold">Test</th>
                        <th className="py-4 font-semibold">Result</th>
                        <th className="py-4 font-semibold">Status</th>
                        <th className="py-4 font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labTests.map((item, index) => (
                        <tr
                          key={`${item.test_name}-${index}`}
                          className="border-b border-slate-100 transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4 font-medium text-slate-900">
                            {item.test_name || "-"}
                          </td>
                          <td className="py-4 text-slate-700">{item.result ?? "-"}</td>
                          <td className="py-4 capitalize text-slate-700">
                            {item.status || "-"}
                          </td>
                          <td className="py-4 text-slate-700">
                            {formatINR(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="hidden">
              <div ref={printRef}>
                <PrintBill bill={bill} />
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
            onClick={() => onDownloadPdf?.(bill.id)}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}