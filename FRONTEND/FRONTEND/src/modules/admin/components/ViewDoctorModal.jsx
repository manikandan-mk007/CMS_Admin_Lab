const Row = ({ label, value, full = false }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">{value || "-"}</p>
    </div>
  </div>
);

const ViewDoctorModal = ({ isOpen, onClose, doctor, staffMap, specMap }) => {
  if (!isOpen || !doctor) return null;

  const staff = staffMap?.[doctor.staff];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Doctor Profile
            </p>
            <h2 className="text-2xl font-bold text-slate-900">Doctor Details</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-6 md:p-8">
          <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-5 text-white">
            <p className="text-sm text-blue-100">Doctor</p>
            <h3 className="mt-1 text-2xl font-bold">{doctor.full_name || "-"}</h3>
            <p className="mt-2 text-sm text-blue-100">
              {specMap?.[doctor.specialization] || "No specialization"} •{" "}
              {staff?.is_active ? "Active" : "Inactive"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Row label="Name" value={doctor.full_name} />
            <Row label="Phone" value={staff?.phone} />
            <Row label="Email" value={staff?.user?.email} />
            <Row label="Username" value={staff?.user?.username} />
            <Row label="Gender" value={staff?.gender} />
            <Row label="Qualification" value={staff?.qualification} />
            <Row label="Salary" value={staff?.salary} />
            <Row label="Specialization" value={specMap?.[doctor.specialization]} />
            <Row label="Consultation Fee" value={doctor.consultation_fee} />
            <Row label="Available From" value={doctor.available_from} />
            <Row label="Available To" value={doctor.available_to} />
            <Row label="Slots" value={doctor.max_tokens} />
            <Row label="Address" value={staff?.address} full />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDoctorModal;