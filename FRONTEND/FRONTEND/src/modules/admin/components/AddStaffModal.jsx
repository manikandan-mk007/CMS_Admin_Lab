import { useEffect, useRef, useState } from "react";
import API from "../../../api/axios";
import { createStaff } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

const initialForm = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  role: "",
  gender: "M",
  date_of_birth: "",
  qualification: "",
  address: "",
  salary: "",
};

const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export default function AddStaffModal({ isOpen, onClose, onSuccess }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      setForm(initialForm);
      setErrors({});
      setBackendError("");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await API.get("manager/groups/");
      setRoles(res.data || []);
    } catch {
      setRoles([]);
    }
  };

  const buildPayload = (currentForm) => ({
    user: {
      username: currentForm.username.trim(),
      first_name: currentForm.first_name.trim(),
      last_name: currentForm.last_name.trim(),
      email: currentForm.email.trim(),
      password: currentForm.password,
    },
    phone: currentForm.phone.trim(),
    role: currentForm.role,
    gender: currentForm.gender,
    date_of_birth: currentForm.date_of_birth,
    qualification: currentForm.qualification.trim(),
    address: currentForm.address.trim(),
    salary: Number(currentForm.salary),
  });

  const validateField = (name, value) => {
    switch (name) {
      case "username":
        if (!String(value).trim()) return "Username is required.";
        return "";

      case "first_name":
        if (!String(value).trim()) return "First name is required.";
        return "";

      case "last_name":
        if (!String(value).trim()) return "Last name is required.";
        return "";

      case "email":
        if (!String(value).trim()) return "Email is required.";
        return "";

      case "password":
        if (!String(value).trim()) return "Password is required.";
        if (String(value).length < 8) return "Password must be at least 8 characters.";
        return "";

      case "phone":
        if (!String(value).trim()) return "Phone is required.";
        if (!/^[6-9]\d{9}$/.test(String(value))) return "Enter valid 10-digit phone.";
        return "";

      case "role":
        if (!value) return "Role is required.";
        return "";

      case "date_of_birth":
        if (!value) return "Date of birth is required.";
        return "";

      case "qualification":
        if (!String(value).trim()) return "Qualification is required.";
        if (String(value).trim().length < 2) {
          return "Qualification must be at least 2 characters.";
        }
        return "";

      case "address":
        if (!String(value).trim()) return "Address is required.";
        if (String(value).trim().length < 5) {
          return "Address must be at least 5 characters.";
        }
        return "";

      case "salary":
        if (value === "" || value === null) {
          return "Salary is required.";
        }
        if (Number(value) <= 0) {
          return "Salary must be greater than 0.";
        }
        return "";

      default:
        return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};

    Object.keys(initialForm).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });

    return newErrors;
  };

  const extractBackendError = (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (!data) return "Cannot create staff.";
    if (status === 405) return "Cannot create staff.";
    if (typeof data === "string") return "Cannot create staff.";
    if (data.detail === 'Method "POST" not allowed.') return "Cannot create staff.";

    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
      return data.non_field_errors[0];
    }

    if (data.error) return data.error;
    if (data.message) return data.message;

    return "Cannot create staff.";
  };

  const mapBackendFieldErrors = (data) => {
    const fieldErrors = {};

    if (!data || typeof data !== "object") return fieldErrors;

    if (data.user && typeof data.user === "object") {
      Object.entries(data.user).forEach(([key, value]) => {
        fieldErrors[key] = Array.isArray(value) ? value[0] : value;
      });
    }

    Object.entries(data).forEach(([key, value]) => {
      if (
        key === "user" ||
        key === "message" ||
        key === "detail" ||
        key === "non_field_errors" ||
        key === "error"
      ) {
        return;
      }

      fieldErrors[key] = Array.isArray(value) ? value[0] : value;
    });

    return fieldErrors;
  };

  const applyBackendFieldErrors = (error) => {
    const data = error?.response?.data;
    const fieldErrors = mapBackendFieldErrors(data);

    if (Object.keys(fieldErrors).length > 0) {
      setErrors((prev) => ({
        ...prev,
        ...fieldErrors,
      }));
      return true;
    }

    return false;
  };

  const shouldRunInstantValidation = (payload) => {
    return (
      payload.user.username &&
      payload.user.first_name &&
      payload.user.last_name &&
      payload.user.email &&
      payload.user.password &&
      payload.phone &&
      payload.role &&
      payload.date_of_birth &&
      payload.qualification &&
      payload.address &&
      payload.salary
    );
  };

  const validateStaffInstantly = async (payload) => {
    const requestId = Date.now() + Math.random();
    requestIdRef.current = requestId;

    try {
      setIsChecking(true);

      await API.post("manager/staff/validate/", payload);

      if (requestIdRef.current !== requestId) return;

      setBackendError("");
    } catch (error) {
      if (requestIdRef.current !== requestId) return;

      applyBackendFieldErrors(error);
      setBackendError("");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsChecking(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone" && (!/^\d*$/.test(value) || value.length > 10)) return;
    if ((name === "first_name" || name === "last_name") && !/^[A-Za-z ]*$/.test(value)) return;
    if (name === "salary" && value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    const updatedForm = {
      ...form,
      [name]: value,
    };

    setForm(updatedForm);

    const localError = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    setBackendError("");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const payload = buildPayload(updatedForm);

    if (!shouldRunInstantValidation(payload)) return;
    if (!/^[6-9]\d{9}$/.test(payload.phone)) return;
    if (payload.user.password.length < 8) return;
    if (localError) return;

    debounceRef.current = setTimeout(() => {
      validateStaffInstantly(payload);
    }, 500);
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    setErrors(newErrors);
    setBackendError("");

    if (Object.keys(newErrors).length > 0) {
      showError("Please fix form errors.");
      return;
    }

    try {
      setIsSubmitting(true);

      await createStaff(buildPayload(form));

      showSuccess("Staff created successfully");
      setForm(initialForm);
      setErrors({});
      setBackendError("");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      const hasFieldErrors = applyBackendFieldErrors(error);

      if (!hasFieldErrors) {
        const message = extractBackendError(error);
        setBackendError(message);
        showError(message);
      } else {
        setBackendError("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    setBackendError("");
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            New Staff
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Add Staff</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {backendError ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {backendError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={inputClass(errors.username)}
              />
              {errors.username ? <p className="mt-2 text-xs text-red-500">{errors.username}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
                className={inputClass(errors.email)}
              />
              {errors.email ? <p className="mt-2 text-xs text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                First Name
              </label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                className={inputClass(errors.first_name)}
              />
              {errors.first_name ? <p className="mt-2 text-xs text-red-500">{errors.first_name}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Last Name
              </label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
                className={inputClass(errors.last_name)}
              />
              {errors.last_name ? <p className="mt-2 text-xs text-red-500">{errors.last_name}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={inputClass(errors.password)}
              />
              {errors.password ? <p className="mt-2 text-xs text-red-500">{errors.password}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className={inputClass(errors.phone)}
              />
              {errors.phone ? <p className="mt-2 text-xs text-red-500">{errors.phone}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={inputClass(errors.role)}
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.role ? <p className="mt-2 text-xs text-red-500">{errors.role}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass(errors.gender)}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              {errors.gender ? <p className="mt-2 text-xs text-red-500">{errors.gender}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
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
                value={form.qualification}
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
                value={form.salary}
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
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
                rows={4}
                className={inputClass(errors.address)}
              />
              {errors.address ? <p className="mt-2 text-xs text-red-500">{errors.address}</p> : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={handleClose}
              className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isChecking}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Saving..." : isChecking ? "Checking..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}