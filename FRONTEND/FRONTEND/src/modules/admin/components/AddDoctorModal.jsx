import { useEffect, useRef, useState } from "react";
import { createDoctor, validateDoctorField } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export default function AddDoctorModal({
  isOpen,
  onClose,
  onSuccess,
  staff = [],
  specializations = [],
}) {
  const [form, setForm] = useState({
    staff: "",
    specialization: "",
    consultation_fee: "",
    available_from: "",
    available_to: "",
    slot_duration: 15,
    date_of_joining: "",
  });

  const [errors, setErrors] = useState({});
  const validationTimers = useRef({});
  const validationRequestId = useRef({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        staff: "",
        specialization: "",
        consultation_fee: "",
        available_from: "",
        available_to: "",
        slot_duration: 15,
        date_of_joining: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      Object.values(validationTimers.current).forEach(clearTimeout);
    };
  }, []);

  const availableStaff = staff.filter(
    (s) => String(s.role || "").toLowerCase() === "doctor" && s.is_active
  );

  const validateLocalField = (name, value, nextForm) => {
    switch (name) {
      case "staff":
        return !nextForm.staff ? "Staff is required" : "";

      case "specialization":
        return !nextForm.specialization ? "Specialization is required" : "";

      case "consultation_fee":
        if (!nextForm.consultation_fee) return "Fee is required";
        if (Number(nextForm.consultation_fee) < 0) return "Fee cannot be negative";
        return "";

      case "available_from":
        if (!nextForm.available_from) return "Start time is required";
        if (
          nextForm.available_from &&
          nextForm.available_to &&
          nextForm.available_from >= nextForm.available_to
        ) {
          return "";
        }
        return "";

      case "available_to":
        if (!nextForm.available_to) return "End time is required";
        if (
          nextForm.available_from &&
          nextForm.available_to &&
          nextForm.available_from >= nextForm.available_to
        ) {
          return "End time must be after start time";
        }
        return "";

      case "date_of_joining":
        return !nextForm.date_of_joining ? "Date of joining is required" : "";

      case "slot_duration":
        if (!nextForm.slot_duration) return "Slot duration is required";
        if (Number(nextForm.slot_duration) <= 0) return "Slot duration must be greater than 0";
        return "";

      default:
        return "";
    }
  };

  const applyCrossFieldValidation = (nextForm) => {
    const nextErrors = {};

    if (
      nextForm.available_from &&
      nextForm.available_to &&
      nextForm.available_from >= nextForm.available_to
    ) {
      nextErrors.available_to = "End time must be after start time";
    }

    setErrors((prev) => ({
      ...prev,
      ...nextErrors,
      ...(nextErrors.available_to ? {} : { available_to: prev.available_to === "End time must be after start time" ? "" : prev.available_to }),
    }));
  };

  const runBackendValidation = async (field, value, nextForm) => {
    const requestId = Date.now() + Math.random();
    validationRequestId.current[field] = requestId;

    try {
      const res = await validateDoctorField({
        field,
        value,
        form: nextForm,
      });

      if (validationRequestId.current[field] !== requestId) return;

      setErrors((prev) => ({
        ...prev,
        [field]: res?.ok ? "" : res?.message || "Invalid value",
      }));
    } catch (err) {
      if (validationRequestId.current[field] !== requestId) return;

      const data = err.response?.data || {};
      const message =
        data?.[field] ||
        data?.message ||
        (Array.isArray(data?.[field]) ? data[field][0] : "");

      if (message) {
        setErrors((prev) => ({
          ...prev,
          [field]: Array.isArray(message) ? message[0] : message,
        }));
      }
    }
  };

  const scheduleValidation = (name, value, nextForm) => {
    const localError = validateLocalField(name, value, nextForm);

    setErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    applyCrossFieldValidation(nextForm);

    if (validationTimers.current[name]) {
      clearTimeout(validationTimers.current[name]);
    }

    if (localError) return;

    validationTimers.current[name] = setTimeout(() => {
      runBackendValidation(name, value, nextForm);
    }, 400);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "consultation_fee" && Number(value) < 0) return;

    const nextForm = {
      ...form,
      [name]: name === "slot_duration" ? Number(value) : value,
    };

    setForm(nextForm);
    scheduleValidation(name, nextForm[name], nextForm);

    if (name === "available_from" || name === "available_to") {
      const otherField = name === "available_from" ? "available_to" : "available_from";
      const otherError = validateLocalField(otherField, nextForm[otherField], nextForm);

      setErrors((prev) => ({
        ...prev,
        [otherField]: otherError,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const value = form[name];

    if (validationTimers.current[name]) {
      clearTimeout(validationTimers.current[name]);
    }

    const localError = validateLocalField(name, value, form);

    setErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    applyCrossFieldValidation(form);

    if (!localError) {
      runBackendValidation(name, value, form);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.staff) newErrors.staff = "Staff is required";
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
      await createDoctor(form);
      showSuccess("Doctor created successfully");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const data = err.response?.data || {};
      const backendErrors = {};
      Object.entries(data).forEach(([key, value]) => {
        backendErrors[key] = Array.isArray(value) ? value[0] : value;
      });
      setErrors(backendErrors);
      showError("Failed to create doctor");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            New Doctor
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Add Doctor</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Doctor Staff
              </label>
              <select
                name="staff"
                value={form.staff}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass(errors.staff)}
              >
                <option value="">Select doctor staff</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
              {errors.staff ? <p className="mt-2 text-xs text-red-500">{errors.staff}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Specialization
              </label>
              <select
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass(errors.specialization)}
              >
                <option value="">Select specialization</option>
                {specializations.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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
                value={form.consultation_fee}
                onChange={handleChange}
                onBlur={handleBlur}
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
                value={form.slot_duration}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter slot duration"
                className={inputClass(errors.slot_duration)}
              />
              {errors.slot_duration ? <p className="mt-2 text-xs text-red-500">{errors.slot_duration}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Available From
              </label>
              <input
                type="time"
                name="available_from"
                value={form.available_from}
                onChange={handleChange}
                onBlur={handleBlur}
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
                value={form.available_to}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass(errors.available_to)}
              />
              {errors.available_to ? <p className="mt-2 text-xs text-red-500">{errors.available_to}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Joining
              </label>
              <input
                type="date"
                name="date_of_joining"
                value={form.date_of_joining}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass(errors.date_of_joining)}
              />
              {errors.date_of_joining ? <p className="mt-2 text-xs text-red-500">{errors.date_of_joining}</p> : null}
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
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}