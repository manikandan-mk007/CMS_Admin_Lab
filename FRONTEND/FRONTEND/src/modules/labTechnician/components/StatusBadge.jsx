export default function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const styles = {
    active: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border border-red-200 bg-red-50 text-red-700",
    pending: "border border-amber-200 bg-amber-50 text-amber-700",
    complete: "border border-blue-200 bg-blue-50 text-blue-700",
    completed: "border border-blue-200 bg-blue-50 text-blue-700",
    paid: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    unpaid: "border border-red-200 bg-red-50 text-red-700",
    partial: "border border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        styles[normalized] || "border border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {status || "-"}
    </span>
  );
}