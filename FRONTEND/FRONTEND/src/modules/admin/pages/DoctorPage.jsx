import { useEffect, useState } from "react";
import {
  getDoctors,
  getStaff,
  getSpecializations,
} from "../api/adminApi";

import PageHeader from "../components/PageHeader";
import EmptyState from "../../labTechnician/components/EmptyState";
import StatusBadge from "../../labTechnician/components/StatusBadge";
import { showError } from "../../labTechnician/utils/toast";

import AddDoctorModal from "../components/AddDoctorModal";
import EditDoctorModal from "../components/EditDoctorModal";
import ViewDoctorModal from "../components/ViewDoctorModal";

const formatDoctorCode = (id) => `DR${String(id).padStart(3, "0")}`;

export default function DoctorPage() {
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [showInactive, setShowInactive] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewDoctor, setViewDoctor] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, staffRes, specRes] = await Promise.all([
        getDoctors(),
        getStaff(),
        getSpecializations(),
      ]);

      setDoctors(docRes.data || []);
      setStaff(staffRes.data || []);
      setSpecializations(specRes.data || []);
    } catch {
      showError("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const specMap = {};
  specializations.forEach((s) => {
    specMap[s.id] = s.name;
  });

  const staffMap = {};
  staff.forEach((s) => {
    staffMap[s.id] = s;
  });

  const getStatus = (doctor) => staffMap[doctor.staff]?.is_active ?? false;

  const filteredDoctors = doctors.filter((d) => {
    const isActive = staffMap[d.staff]?.is_active ?? false;
    return showInactive ? !isActive : isActive;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        subtitle="Manage doctors, doctor assignments, and doctor availability setup"
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
            + Add Doctor
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading doctors...
          </div>
        ) : !filteredDoctors.length ? (
          <EmptyState message="No doctor records found." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-sm text-slate-600">
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Name</th>
                  <th className="px-4 py-4 font-semibold">Specialization</th>
                  <th className="px-4 py-4 font-semibold">Fee</th>
                  <th className="px-4 py-4 font-semibold">Slots</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {formatDoctorCode(d.id)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {d.full_name}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {specMap[d.specialization] || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {d.consultation_fee}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{d.max_tokens}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={getStatus(d) ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setViewDoctor(d);
                            setViewOpen(true);
                          }}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          View
                        </button>

                        {!showInactive ? (
                          <button
                            onClick={() => {
                              setSelectedDoctor(d);
                              setEditOpen(true);
                            }}
                            className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddDoctorModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchData}
        staff={staff}
        specializations={specializations}
      />

      <EditDoctorModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchData}
        doctor={selectedDoctor}
        specializations={specializations}
      />

      <ViewDoctorModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        doctor={viewDoctor}
        staffMap={staffMap}
        specMap={specMap}
      />
    </div>
  );
}