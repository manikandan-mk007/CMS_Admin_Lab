const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  actionType = "delete",
}) => {
  if (!isOpen) return null;

  const isDelete = actionType === "delete";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Confirm
          </p>
          <h2 className="text-xl font-bold text-slate-900">Confirm Action</h2>
        </div>

        <div className="p-6">
          <div
            className={`rounded-2xl border px-4 py-4 ${
              isDelete
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <p className="text-sm leading-6">
              {message ||
                (isDelete
                  ? "Are you sure you want to mark this Staff inactive?"
                  : "Are you sure you want to restore this Staff?")}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              className={`rounded-2xl px-5 py-3 font-semibold text-white transition ${
                isDelete
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isDelete ? "Mark Inactive" : "Restore"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;