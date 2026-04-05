import { useEffect, useRef, useState } from "react";
import { createSpecialization, validateSpecializationField } from "../api/adminApi";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

export default function AddSpecializationModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const validationTimer = useRef(null);
  const requestRef = useRef(0);

  const validate = (value) => {
    if (!value.trim()) return "Specialization name is required";
    if (!/^[A-Za-z ]+$/.test(value.trim())) {
      return "Letters only, no numbers or special characters";
    }
    if (value.trim().length < 3) return "Minimum 3 characters";
    if (value.trim().length > 100) return "Maximum 100 characters";
    return "";
  };

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, []);

  const runBackendValidation = async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const currentRequest = Date.now();
    requestRef.current = currentRequest;

    try {
      const res = await validateSpecializationField({ name: trimmed });

      if (requestRef.current !== currentRequest) return;

      if (res?.data?.ok) {
        setError("");
      } else {
        setError(res?.data?.message || "Invalid specialization name");
      }
    } catch (err) {
      if (requestRef.current !== currentRequest) return;

      const data = err.response?.data || {};
      const backendMessage =
        Array.isArray(data?.name) ? data.name[0] : data?.name || data?.message || "";

      if (backendMessage) {
        setError(backendMessage);
      }
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

    if (!localError) {
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
      await createSpecialization({ name: name.trim() });
      showSuccess("Specialization created successfully");
      setName("");
      setError("");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const data = err.response?.data || {};
      const backendMessage =
        Array.isArray(data?.name) ? data.name[0] : data?.name || data?.message || "";

      if (backendMessage) {
        setError(backendMessage);
      }

      showError(backendMessage || "Failed to create specialization");
    }
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            New Entry
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            Add Specialization
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
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}