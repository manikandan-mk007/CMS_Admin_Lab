import { useEffect, useRef, useState } from "react";
import API from "../../../api/axios";
import { updateSpecialization } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

export default function EditSpecializationModal({
  isOpen,
  onClose,
  onSuccess,
  data,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const validationTimer = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setError("");
    }
  }, [data]);

  useEffect(() => {
    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
      }
    };
  }, []);

  const validate = (value) => {
    if (!value.trim()) return "Specialization name is required";
    if (!/^[A-Za-z ]+$/.test(value.trim())) {
      return "Letters only, no numbers or special characters";
    }
    if (value.trim().length < 3) return "Minimum 3 characters";
    if (value.trim().length > 100) return "Maximum 100 characters";
    return "";
  };

  const extractFieldError = (err) => {
    const data = err?.response?.data || {};

    return (
      (Array.isArray(data?.name) ? data.name[0] : data?.name) ||
      data?.message ||
      data?.detail ||
      ""
    );
  };

  const runBackendValidation = async (value) => {
    if (!data?.id) return;

    const requestId = Date.now() + Math.random();
    requestIdRef.current = requestId;

    try {
      await API.post(`manager/specializations/${data.id}/validate-field/`, {
        name: value.trim(),
      });

      if (requestIdRef.current !== requestId) return;
      setError("");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(extractFieldError(err) || "");
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;

    if (!/^[A-Za-z ]*$/.test(value)) return;

    setName(value);

    const localError = validate(value);
    setError(localError);

    if (validationTimer.current) {
      clearTimeout(validationTimer.current);
    }

    if (localError) return;
    if (!value.trim()) return;
    if (data?.name?.trim().toLowerCase() === value.trim().toLowerCase()) {
      setError("");
      return;
    }

    validationTimer.current = setTimeout(() => {
      runBackendValidation(value);
    }, 400);
  };

  const handleBlur = () => {
    if (validationTimer.current) {
      clearTimeout(validationTimer.current);
    }

    const localError = validate(name);
    setError(localError);

    if (!localError && name.trim()) {
      if (data?.name?.trim().toLowerCase() === name.trim().toLowerCase()) {
        setError("");
        return;
      }
      runBackendValidation(name);
    }
  };

  const handleSubmit = async () => {
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateSpecialization(data.id, { name: name.trim() });
      showSuccess("Specialization updated successfully");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const backendMessage = extractFieldError(err);

      if (backendMessage) {
        setError(backendMessage);
        return;
      }

      showError("Failed to update specialization");
    }
  };

  const handleClose = () => {
    setError("");
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Update Entry
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            Edit Specialization
          </h2>
        </div>

        <div className="px-6 py-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Specialization Name
          </label>
          <input
            value={name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter specialization name"
            className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
            }`}
          />
          {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
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