import { forwardRef } from "react";

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const PrintBill = forwardRef(function PrintBill({ bill }, ref) {
  if (!bill) return null;

  const consultation = bill.consultation || {};
  const patient = consultation.patient || {};
  const doctor = consultation.doctor || {};
  const appointment = consultation.appointment || {};
  const labTests = bill.lab_tests || [];

  return (
    <div ref={ref} className="print-bill">
      <div className="print-bill__header">
        <div>
          <div className="print-bill__eyebrow">Laboratory Receipt</div>
          <h1 className="print-bill__title">Lab Billing Receipt</h1>
          <div className="print-bill__subtext">
            Billing ID: {formatDisplayId("BL", bill.id)}
          </div>
        </div>

        <div className="print-bill__status-block">
          <div className="print-bill__label">Payment Status</div>
          <div className="print-bill__status">
            {bill.payment_status || "-"}
          </div>
        </div>
      </div>

      <div className="print-bill__cards">
        <div className="print-bill__card">
          <div className="print-bill__card-title">Visit Details</div>

          <div className="print-bill__row">
            <span>Consultation ID</span>
            <strong>{formatDisplayId("CT", consultation.id)}</strong>
          </div>

          <div className="print-bill__row">
            <span>Appointment ID</span>
            <strong>{formatDisplayId("AP", appointment.id)}</strong>
          </div>

          <div className="print-bill__row print-bill__row--last">
            <span>Created At</span>
            <strong>{formatDateTime(bill.created_at)}</strong>
          </div>
        </div>

        <div className="print-bill__card">
          <div className="print-bill__card-title">Patient & Doctor</div>

          <div className="print-bill__row">
            <span>Patient</span>
            <strong>{patient.name || "-"}</strong>
          </div>

          <div className="print-bill__row">
            <span>Doctor</span>
            <strong>{doctor.name || "-"}</strong>
          </div>

          <div className="print-bill__row print-bill__row--last">
            <span>Payment Status</span>
            <strong>{bill.payment_status || "-"}</strong>
          </div>
        </div>
      </div>

      <div className="print-bill__section-title">Lab Test Items</div>

      <table className="print-bill__table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Result</th>
            <th>Status</th>
            <th className="align-right">Price</th>
          </tr>
        </thead>

        <tbody>
          {labTests.length ? (
            labTests.map((item, index) => (
              <tr key={`${item.test_name}-${index}`}>
                <td className="font-strong">{item.test_name || "-"}</td>
                <td>{item.result ?? "-"}</td>
                <td className="capitalize-cell">{item.status || "-"}</td>
                <td className="align-right">{formatINR(item.price)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="empty-cell">
                No lab items found.
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan="3" className="tfoot-label">
              Total Amount
            </td>
            <td className="align-right tfoot-value">
              {formatINR(bill.total_amount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="print-bill__footer-note">
        This is a system-generated billing receipt for laboratory services.
      </div>
    </div>
  );
});

export default PrintBill;