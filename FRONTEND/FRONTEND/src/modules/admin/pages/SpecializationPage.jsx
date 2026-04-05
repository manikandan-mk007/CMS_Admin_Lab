import { useEffect, useState } from "react";

import PageHeader from "../components/PageHeader";
import EmptyState from "../../labTechnician/components/EmptyState";
import {
  getSpecializations,
  deleteSpecialization,
} from "../api/adminApi";

import { showError, showSuccess } from "../../labTechnician/utils/toast";

import AddSpecializationModal from "../components/AddSpecializationModal";
import EditSpecializationModal from "../components/EditSpecializationModal";

const formatSpecializationCode = (id) =>
  `SP${String(id).padStart(3, "0")}`;

const SpecializationPage = () => {
  const [data, setData] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getSpecializations();
      setData(res.data || []);
    } catch (err) {
      showError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to load specializations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSpecialization(id);
      showSuccess("Specialization deleted");
      load();
    } catch (err) {
      showError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Delete failed"
      );
    }
  };

  const handleEdit = (item) => {
    setSelected(item);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specializations"
        subtitle="Manage medical specialization master data"
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setOpenModal(true)}
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Specialization
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading specializations...
          </div>
        ) : !data.length ? (
          <EmptyState message="No specializations found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-sm text-slate-600">
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Name</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {formatSpecializationCode(item.id)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSpecializationModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={load}
      />

      <EditSpecializationModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={load}
        data={selected}
      />
    </div>
  );
};

export default SpecializationPage;