import { useEffect, useState } from "react";
import { updateDoctor } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export default function EditDoctorModal({
  isOpen,
  onClose,
  onSuccess,
  doctor,
  specializations = [],
}) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (doctor) {
      setForm({
        ...doctor,
        slot_duration: Number(doctor.slot_duration || 15),
      });
      setErrors({});
    }
  }, [doctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "consultation_fee" && Number(value) < 0) return;

    setForm((prev) => ({
      ...prev,
      [name]: name === "slot_duration" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.specialization) newErrors.specialization = "Specialization is required";
    if (!form.consultation_fee) newErrors.consultation_fee = "Fee is required";
    if (!form.available_from) newErrors.available_from = "Start time is required";
    if (!form.available_to) newErrors.available_to = "End time is required";
    if (!form.date_of_joining) newErrors.date_of_joining = "Date of joining is required";

    if (
      form.available_from &&
      form.available_to &&
      form.available_from >= form.available_to
    ) {
      newErrors.available_to = "End time must be after start time";
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showError("Please fix form errors");
      return;
    }

    try {
      await updateDoctor(doctor.id, form);
      showSuccess("Doctor updated successfully");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const data = err.response?.data || {};
      const backendErrors = {};
      Object.entries(data).forEach(([key, value]) => {
        backendErrors[key] = Array.isArray(value) ? value[0] : value;
      });
      setErrors(backendErrors);
      showError("Failed to update doctor");
    }
  };

  if (!isOpen || !doctor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Update Doctor
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Edit Doctor</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Specialization
              </label>
              <select
                name="specialization"
                value={form.specialization || ""}
                onChange={handleChange}
                className={inputClass(errors.specialization)}
              >
                <option value="">Select specialization</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.specialization ? <p className="mt-2 text-xs text-red-500">{errors.specialization}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Consultation Fee
              </label>
              <input
                name="consultation_fee"
                value={form.consultation_fee || ""}
                onChange={handleChange}
                placeholder="Enter consultation fee"
                className={inputClass(errors.consultation_fee)}
              />
              {errors.consultation_fee ? <p className="mt-2 text-xs text-red-500">{errors.consultation_fee}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Slot Duration
              </label>
              <input
                type="number"
                name="slot_duration"
                value={form.slot_duration || 15}
                onChange={handleChange}
                placeholder="Enter slot duration"
                className={inputClass(errors.slot_duration)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Joining
              </label>
              <input
                type="date"
                name="date_of_joining"
                value={form.date_of_joining || ""}
                onChange={handleChange}
                className={inputClass(errors.date_of_joining)}
              />
              {errors.date_of_joining ? <p className="mt-2 text-xs text-red-500">{errors.date_of_joining}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Available From
              </label>
              <input
                type="time"
                name="available_from"
                value={form.available_from || ""}
                onChange={handleChange}
                className={inputClass(errors.available_from)}
              />
              {errors.available_from ? <p className="mt-2 text-xs text-red-500">{errors.available_from}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Available To
              </label>
              <input
                type="time"
                name="available_to"
                value={form.available_to || ""}
                onChange={handleChange}
                className={inputClass(errors.available_to)}
              />
              {errors.available_to ? <p className="mt-2 text-xs text-red-500">{errors.available_to}</p> : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}