export default function EmptyState({ message = "No data found." }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-6 py-10 text-center">
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );
}