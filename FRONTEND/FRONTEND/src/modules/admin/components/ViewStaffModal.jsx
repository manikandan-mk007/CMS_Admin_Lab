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

const ViewStaffModal = ({ isOpen, onClose, staff }) => {
  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Staff Profile
            </p>
            <h2 className="text-2xl font-bold text-slate-900">Staff Details</h2>
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
            <p className="text-sm text-blue-100">Staff Member</p>
            <h3 className="mt-1 text-2xl font-bold">
              {staff.full_name || "-"}
            </h3>
            <p className="mt-2 text-sm text-blue-100">
              {staff.role || "Staff"} • {staff.is_active ? "Active" : "Inactive"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Row label="Name" value={staff.full_name} />
            <Row label="Phone" value={staff.phone} />
            <Row label="Email" value={staff.user?.email} />
            <Row label="Username" value={staff.user?.username} />
            <Row label="Role" value={staff.role} />
            <Row label="Gender" value={staff.gender} />
            <Row label="Qualification" value={staff.qualification} />
            <Row label="Salary" value={staff.salary} />
            <Row label="Date of Birth" value={staff.date_of_birth} />
            <Row label="Status" value={staff.is_active ? "Active" : "Inactive"} />
            <Row label="Address" value={staff.address} full />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStaffModal;