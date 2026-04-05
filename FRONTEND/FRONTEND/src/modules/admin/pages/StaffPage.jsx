import { useEffect, useState } from "react";
import {
  getStaff,
  deactivateStaff,
  restoreStaff,
} from "../api/adminApi";

import PageHeader from "../components/PageHeader";
import EmptyState from "../../labTechnician/components/EmptyState";
import StatusBadge from "../../labTechnician/components/StatusBadge";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

import AddStaffModal from "../components/AddStaffModal";
import EditStaffModal from "../components/EditStaffModal";
import ViewStaffModal from "../components/ViewStaffModal";
import ConfirmModal from "../components/ConfirmModal";

const formatUserCode = (id, role) => {
  const prefix = String(role || "").toLowerCase() === "doctor" ? "DR" : "ST";
  return `${prefix}${String(id).padStart(3, "0")}`;
};

export default function StaffPage() {
  const [openModal, setOpenModal] = useState(false);
  const [staff, setStaff] = useState([]);
  const [showInactive, setShowInactive] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [actionType, setActionType] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, [showInactive]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await getStaff(!showInactive);
      setStaff(res.data || []);
    } catch (err) {
      showError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to load staff"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      if (actionType === "delete") {
        await deactivateStaff(selectedId);
        showSuccess("Staff marked inactive");
      } else {
        await restoreStaff(selectedId);
        showSuccess("Staff restored");
      }

      setConfirmOpen(false);
      fetchStaff();
    } catch (err) {
      showError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          (Array.isArray(err.response?.data?.non_field_errors) &&
          err.response.data.non_field_errors.length
            ? err.response.data.non_field_errors[0]
            : "Action failed")
      );
    }
  };

  const openDeleteConfirm = (id) => {
    setSelectedId(id);
    setActionType("delete");
    setConfirmOpen(true);
  };

  const openRestoreConfirm = (id) => {
    setSelectedId(id);
    setActionType("restore");
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Create, view, edit, deactivate, and restore staff members"
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setShowInactive(false)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                !showInactive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              Active
            </button>

            <button
              onClick={() => setShowInactive(true)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                showInactive
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              Inactive
            </button>
          </div>

          <button
            onClick={() => setOpenModal(true)}
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Staff
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading staff...
          </div>
        ) : !staff.length ? (
          <EmptyState message="No staff records found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-sm text-slate-600">
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Name</th>
                  <th className="px-4 py-4 font-semibold">Phone</th>
                  <th className="px-4 py-4 font-semibold">Role</th>
                  <th className="px-4 py-4 font-semibold">Qualification</th>
                  <th className="px-4 py-4 font-semibold">Salary</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {formatUserCode(s.id, s.role)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {s.full_name}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.phone}</td>
                    <td className="px-4 py-4 text-slate-600">{s.role}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {s.qualification || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.salary || "-"}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={s.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setViewStaff(s);
                            setViewOpen(true);
                          }}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          View
                        </button>

                        {!showInactive ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedStaff(s);
                                setEditOpen(true);
                              }}
                              className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => openDeleteConfirm(s.id)}
                              className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
                            >
                              Inactive
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openRestoreConfirm(s.id)}
                            className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddStaffModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchStaff}
      />

      <EditStaffModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchStaff}
        staff={selectedStaff}
      />

      <ViewStaffModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        staff={viewStaff}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        actionType={actionType}
      />
    </div>
  );
}