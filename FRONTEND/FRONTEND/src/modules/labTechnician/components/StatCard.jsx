export default function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}