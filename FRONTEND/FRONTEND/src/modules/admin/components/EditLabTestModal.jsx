import { useEffect, useState } from "react";
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

export default function EditLabTestModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  initialValues = defaultForm,
  fieldErrors: externalFieldErrors = {},
}) {
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialValues || defaultForm);
      setFieldErrors(externalFieldErrors || {});
    }
  }, [isOpen, initialValues, externalFieldErrors]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newFieldErrors = {};

    if (!form.test_name.trim()) newFieldErrors.test_name = "Test name is required.";
    if (!form.description.trim()) newFieldErrors.description = "Description is required.";
    if (form.min_range === "") newFieldErrors.min_range = "Min range is required.";
    if (form.max_range === "") newFieldErrors.max_range = "Max range is required.";
    if (form.price === "") newFieldErrors.price = "Price is required.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      showError("Please fill all required fields.");
      return;
    }

    const result = await onSubmit?.(form);

    if (!result?.ok && result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      
      {/* ✅ FIX: fixed height container */}
      <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

        {/* HEADER */}
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Update Lab Test
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Edit Lab Test</h2>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

          {/* ✅ SCROLL AREA */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">

              {/* Test Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Test Name
                </label>
                <input
                  type="text"
                  name="test_name"
                  value={form.test_name}
                  onChange={handleChange}
                  placeholder="Enter test name"
                  className={inputClass(fieldErrors.test_name)}
                />
                {fieldErrors.test_name && (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.test_name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  rows={4}
                  className={inputClass(fieldErrors.description)}
                />
                {fieldErrors.description && (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.description}</p>
                )}
              </div>

              {/* Ranges */}
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
                    placeholder="Enter minimum range"
                    className={inputClass(fieldErrors.min_range)}
                  />
                  {fieldErrors.min_range && (
                    <p className="mt-2 text-sm text-red-500">{fieldErrors.min_range}</p>
                  )}
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
                    placeholder="Enter maximum range"
                    className={inputClass(fieldErrors.max_range)}
                  />
                  {fieldErrors.max_range && (
                    <p className="mt-2 text-sm text-red-500">{fieldErrors.max_range}</p>
                  )}
                </div>
              </div>

              {/* Price */}
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
                  placeholder="Enter price"
                  className={inputClass(fieldErrors.price)}
                />
                {fieldErrors.price && (
                  <p className="mt-2 text-sm text-red-500">{fieldErrors.price}</p>
                )}
              </div>

              {/* Status */}
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

          {/* ✅ FIXED FOOTER */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Update Test"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}