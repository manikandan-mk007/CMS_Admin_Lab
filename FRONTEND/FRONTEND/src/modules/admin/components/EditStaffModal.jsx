import { useEffect, useRef, useState } from "react";
import API from "../../../api/axios";
import { editStaff } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export default function EditStaffModal({ isOpen, onClose, onSuccess, staff }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [isChecking, setIsChecking] = useState(false);

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (staff) {
      setForm({
        phone: staff.phone || "",
        role: staff.role || "",
        gender: staff.gender || "M",
        date_of_birth: staff.date_of_birth || "",
        qualification: staff.qualification || "",
        address: staff.address || "",
        salary: staff.salary || "",
      });
      setErrors({});
    }
  }, [staff]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const validateField = (name, value) => {
    switch (name) {
      case "phone":
        if (!String(value).trim()) return "Phone is required";
        if (!/^[6-9]\d{9}$/.test(String(value))) return "Enter valid 10-digit phone";
        return "";

      case "date_of_birth":
        if (!value) return "Date of birth is required";
        return "";

      case "qualification":
        if (!String(value).trim()) return "Qualification is required";
        return "";

      case "address":
        if (!String(value).trim()) return "Address is required";
        return "";

      case "salary":
        if (value === "" || value === null) return "Salary is required";
        if (Number(value) <= 0) return "Salary must be greater than 0";
        return "";

      default:
        return "";
    }
  };

  const validate = () => {
    const newErrors = {};
    ["phone", "date_of_birth", "qualification", "address", "salary"].forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    return newErrors;
  };

  const mapBackendFieldErrors = (data) => {
    const backendErrors = {};
    if (!data || typeof data !== "object") return backendErrors;

    Object.entries(data).forEach(([key, value]) => {
      if (
        key === "message" ||
        key === "detail" ||
        key === "non_field_errors" ||
        key === "error"
      ) {
        return;
      }
      backendErrors[key] = Array.isArray(value) ? value[0] : value;
    });

    return backendErrors;
  };

  const validateInstantly = async (payload) => {
    const requestId = Date.now() + Math.random();
    requestIdRef.current = requestId;

    try {
      setIsChecking(true);
      await API.post(`manager/staff/${staff.id}/validate/`, payload);

      if (requestIdRef.current !== requestId) return;

      setErrors((prev) => ({
        ...prev,
        phone: "",
        date_of_birth: "",
        qualification: "",
        address: "",
        salary: "",
      }));
    } catch (err) {
      if (requestIdRef.current !== requestId) return;

      const backendErrors = mapBackendFieldErrors(err.response?.data || {});
      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({
          ...prev,
          ...backendErrors,
        }));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsChecking(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone" && (!/^\d*$/.test(value) || value.length > 10)) return;
    if (name === "salary" && value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    if (name === "qualification" && !/^[A-Za-z ]*$/.test(value)) return;

    const nextForm = { ...form, [name]: value };
    setForm(nextForm);

    const localError = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (localError) return;
    if (!staff?.id) return;
    if (!nextForm.phone || !/^[6-9]\d{9}$/.test(nextForm.phone)) return;
    if (!nextForm.date_of_birth || !nextForm.qualification?.trim() || !nextForm.address?.trim()) return;
    if (nextForm.salary === "" || Number(nextForm.salary) <= 0) return;

    debounceRef.current = setTimeout(() => {
      validateInstantly({
        ...nextForm,
        salary: Number(nextForm.salary),
      });
    }, 500);
  };

  const handleSubmit = async () => {
    const newErrors = validate();

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showError("Please fix form errors");
      return;
    }

    try {
      await editStaff(staff.id, {
        ...form,
        salary: Number(form.salary),
      });

      showSuccess("Staff updated successfully");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const backendErrors = mapBackendFieldErrors(err.response?.data || {});
      if (Object.keys(backendErrors).length > 0) {
        setErrors(backendErrors);
        return;
      }

      showError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to update staff"
      );
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Update Staff
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Edit Staff</h2>
        </div>

        <div className="max-h-[calc(90vh-150px)] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                placeholder="Enter phone number"
                className={inputClass(errors.phone)}
              />
              {errors.phone ? <p className="mt-2 text-xs text-red-500">{errors.phone}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender || "M"}
                onChange={handleChange}
                className={inputClass(errors.gender)}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth || ""}
                onChange={handleChange}
                className={inputClass(errors.date_of_birth)}
              />
              {errors.date_of_birth ? <p className="mt-2 text-xs text-red-500">{errors.date_of_birth}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Qualification
              </label>
              <input
                name="qualification"
                value={form.qualification || ""}
                onChange={handleChange}
                placeholder="Enter qualification"
                className={inputClass(errors.qualification)}
              />
              {errors.qualification ? <p className="mt-2 text-xs text-red-500">{errors.qualification}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Salary
              </label>
              <input
                type="number"
                name="salary"
                value={form.salary || ""}
                onChange={handleChange}
                placeholder="Enter salary"
                className={inputClass(errors.salary)}
              />
              {errors.salary ? <p className="mt-2 text-xs text-red-500">{errors.salary}</p> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                name="address"
                value={form.address || ""}
                onChange={handleChange}
                placeholder="Enter address"
                rows={4}
                className={inputClass(errors.address)}
              />
              {errors.address ? <p className="mt-2 text-xs text-red-500">{errors.address}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isChecking}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}