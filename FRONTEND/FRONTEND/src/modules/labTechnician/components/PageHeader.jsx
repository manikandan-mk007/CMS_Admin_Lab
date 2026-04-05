export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-6 py-7 text-white shadow-xl md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
        Lab Technician
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}