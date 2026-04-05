import { useEffect, useRef, useState } from "react";
import CustomDropdown from "../../labTechnician/components/CustomDropdown";
import { showError } from "../../labTechnician/utils/toast";

const formStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const defaultForm = {
  test_name: "",
  description: "",
  min_range: "",
  max_range: "",
  price: "",
  status: "active",
};

const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export default function AddLabTestModal({
  isOpen,
  onClose,
  onSubmit,
  onValidateField,
  submitting,
  initialValues = defaultForm,
}) {
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const validationTimers = useRef({});
  const latestRequestRef = useRef({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialValues || defaultForm);
      setFieldErrors({});
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    return () => {
      Object.values(validationTimers.current).forEach(clearTimeout);
    };
  }, []);

  if (!isOpen) return null;

  const validateLocalField = (name, value, nextForm) => {
    switch (name) {
      case "test_name":
        if (!String(value).trim()) return "Test name is required.";
        return "";

      case "description":
        if (!String(value).trim()) return "Description is required.";
        return "";

      case "min_range":
        if (value === "") return "Min range is required.";
        if (Number.isNaN(Number(value))) return "Min range must be a valid number.";
        if (
          nextForm.max_range !== "" &&
          !Number.isNaN(Number(nextForm.max_range)) &&
          Number(value) > Number(nextForm.max_range)
        ) {
          return "Min range cannot be greater than max range.";
        }
        return "";

      case "max_range":
        if (value === "") return "Max range is required.";
        if (Number.isNaN(Number(value))) return "Max range must be a valid number.";
        if (
          nextForm.min_range !== "" &&
          !Number.isNaN(Number(nextForm.min_range)) &&
          Number(value) < Number(nextForm.min_range)
        ) {
          return "Max range cannot be less than min range.";
        }
        return "";

      case "price":
        if (value === "") return "Price is required.";
        if (Number.isNaN(Number(value))) return "Price must be a valid number.";
        if (Number(value) < 0) return "Price cannot be negative.";
        return "";

      default:
        return "";
    }
  };

  const mapBackendErrors = (data) => {
    const backendErrors = {};

    if (!data || typeof data !== "object") return backendErrors;

    Object.entries(data).forEach(([key, value]) => {
      if (key === "message" || key === "detail" || key === "non_field_errors") {
        return;
      }
      backendErrors[key] = Array.isArray(value) ? value[0] : value;
    });

    return backendErrors;
  };

  const normalizeValidationMessage = (message) => {
    if (!message) return "";
    if (message === "Invalid value.") return "";
    if (typeof message === "string" && message.toLowerCase() === "invalid value.") {
      return "";
    }
    return message;
  };

  const runBackendValidation = async (name, value, nextForm) => {
    if (typeof onValidateField !== "function") return;

    const requestId = Date.now() + Math.random();
    latestRequestRef.current[name] = requestId;

    try {
      const result = await onValidateField({
        field: name,
        value,
        form: nextForm,
      });

      if (latestRequestRef.current[name] !== requestId) return;

      const resolvedMessage =
        result?.ok === false ? normalizeValidationMessage(result?.message) : "";

      setFieldErrors((prev) => ({
        ...prev,
        [name]: resolvedMessage,
      }));
    } catch (err) {
      if (latestRequestRef.current[name] !== requestId) return;

      const data = err?.response?.data || {};
      const backendMessage = normalizeValidationMessage(
        (Array.isArray(data?.[name]) ? data[name][0] : data?.[name]) ||
          data?.message ||
          data?.detail ||
          ""
      );

      setFieldErrors((prev) => ({
        ...prev,
        [name]: backendMessage,
      }));
    }
  };

  const validateAndSchedule = (name, value, nextForm) => {
    const localError = validateLocalField(name, value, nextForm);

    if (name === "min_range" || name === "max_range") {
      const minError = validateLocalField("min_range", nextForm.min_range, nextForm);
      const maxError = validateLocalField("max_range", nextForm.max_range, nextForm);

      setFieldErrors((prev) => ({
        ...prev,
        min_range: minError,
        max_range: maxError,
      }));
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: localError,
      }));
    }

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

    const nextForm = {
      ...form,
      [name]: value,
    };

    setForm(nextForm);
    validateAndSchedule(name, value, nextForm);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const nextForm = {
      ...form,
      [name]: value,
    };

    if (validationTimers.current[name]) {
      clearTimeout(validationTimers.current[name]);
    }

    if (name === "min_range" || name === "max_range") {
      const minError = validateLocalField("min_range", nextForm.min_range, nextForm);
      const maxError = validateLocalField("max_range", nextForm.max_range, nextForm);

      setFieldErrors((prev) => ({
        ...prev,
        min_range: minError,
        max_range: maxError,
      }));

      if (name === "min_range" && !minError) {
        runBackendValidation(name, value, nextForm);
      }

      if (name === "max_range" && !maxError) {
        runBackendValidation(name, value, nextForm);
      }

      return;
    }

    const localError = validateLocalField(name, value, nextForm);

    setFieldErrors((prev) => ({
      ...prev,
      [name]: localError,
    }));

    if (!localError) {
      runBackendValidation(name, value, nextForm);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newFieldErrors = {
      test_name: validateLocalField("test_name", form.test_name, form),
      description: validateLocalField("description", form.description, form),
      min_range: validateLocalField("min_range", form.min_range, form),
      max_range: validateLocalField("max_range", form.max_range, form),
      price: validateLocalField("price", form.price, form),
    };

    Object.keys(newFieldErrors).forEach((key) => {
      if (!newFieldErrors[key]) delete newFieldErrors[key];
    });

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      showError("Please fill all required fields.");
      return;
    }

    try {
      const result = await onSubmit?.(form);

      if (!result?.ok && result?.fieldErrors) {
        setFieldErrors((prev) => ({
          ...prev,
          ...result.fieldErrors,
        }));
        return;
      }

      if (!result?.ok && result?.message) {
        showError(result.message);
      }
    } catch (err) {
      const data = err?.response?.data || {};
      const backendErrors = mapBackendErrors(data);

      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          ...backendErrors,
        }));
        return;
      }

      showError(data?.message || data?.detail || "Failed to create test.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            New Lab Test
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Add Lab Test</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Test Name
                </label>
                <input
                  type="text"
                  name="test_name"
                  value={form.test_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter test name"
                  className={inputClass(fieldErrors.test_name)}
                />
                {fieldErrors.test_name ? (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.test_name}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter description"
                  rows={4}
                  className={inputClass(fieldErrors.description)}
                />
                {fieldErrors.description ? (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.description}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Min Range
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_range"
                    value={form.min_range}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter minimum range"
                    className={inputClass(fieldErrors.min_range)}
                  />
                  {fieldErrors.min_range ? (
                    <p className="mt-2 text-sm text-red-500">{fieldErrors.min_range}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Max Range
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="max_range"
                    value={form.max_range}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter maximum range"
                    className={inputClass(fieldErrors.max_range)}
                  />
                  {fieldErrors.max_range ? (
                    <p className="mt-2 text-sm text-red-500">{fieldErrors.max_range}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter price"
                  className={inputClass(fieldErrors.price)}
                />
                {fieldErrors.price ? (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.price}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <CustomDropdown
                  value={form.status}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                  options={formStatusOptions}
                  fullWidth
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Create Test"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}