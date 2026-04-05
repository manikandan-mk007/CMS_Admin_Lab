import { useEffect, useMemo, useState } from "react";
import {
  getAdminLabTests,
  createAdminLabTest,
  updateAdminLabTest,
  deleteAdminLabTest,
  validateLabTestField,
} from "../api/adminApi";

import PageHeader from "../components/PageHeader";
import EmptyState from "../../labTechnician/components/EmptyState";
import StatusBadge from "../../labTechnician/components/StatusBadge";
import CustomDropdown from "../../labTechnician/components/CustomDropdown";
import { showError, showInfo, showSuccess } from "../../labTechnician/utils/toast";

import AddLabTestModal from "../components/AddLabTestModal";
import EditLabTestModal from "../components/EditLabTestModal";

const initialForm = {
  test_name: "",
  description: "",
  min_range: "",
  max_range: "",
  price: "",
  status: "active",
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const formatINR = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const formatDisplayId = (prefix, value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${prefix}${String(value).padStart(3, "0")}`;
};

export default function LabTestsPage() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const mapBackendFieldErrors = (data) => {
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

  const loadTests = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getAdminLabTests();
      const data = res.data;

      if (Array.isArray(data)) {
        setTests(data);
      } else if (Array.isArray(data?.results)) {
        setTests(data.results);
      } else {
        setTests([]);
      }
    } catch (err) {
      const message =
        err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to load lab tests";
      setError(message);
      showError(message);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredTests = useMemo(() => {
    return (Array.isArray(tests) ? tests : []).filter((test) => {
      const matchesSearch =
        (test.test_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (test.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter ? test.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  const handleEdit = (test) => {
    setEditingId(test.id);
    setError("");
    setSuccess("");
    setFieldErrors({});

    setForm({
      test_name: test.test_name || "",
      description: test.description || "",
      min_range: test.min_range ?? "",
      max_range: test.max_range ?? "",
      price: test.price ?? "",
      status: test.status || "active",
    });

    setEditOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showInfo("Editing test");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setFieldErrors({});
    setError("");
    setSuccess("");
    setEditOpen(false);
  };

  const handleValidateField = async ({ field, value, form: currentForm }) => {
    try {
      const payload = {
        ...currentForm,
        [field]: value,
        test_name: String(currentForm.test_name ?? "").trim(),
        description: String(currentForm.description ?? "").trim(),
        min_range:
          currentForm.min_range === "" ? "" : Number(currentForm.min_range),
        max_range:
          currentForm.max_range === "" ? "" : Number(currentForm.max_range),
        price: currentForm.price === "" ? "" : Number(currentForm.price),
      };

      await validateLabTestField({
        field,
        value: payload[field],
        form: payload,
      });

      return { ok: true };
    } catch (err) {
      const data = err.response?.data || {};
      const backendErrors = mapBackendFieldErrors(data);

      return {
        ok: false,
        message:
          backendErrors[field] ||
          data?.message ||
          data?.detail ||
          "Invalid value.",
      };
    }
  };

  const handleSubmit = async (payloadForm) => {
    const currentForm = payloadForm || form;
    const newFieldErrors = {};

    if (!currentForm.test_name.trim()) newFieldErrors.test_name = "Test name is required.";
    if (!currentForm.description.trim()) newFieldErrors.description = "Description is required.";
    if (currentForm.min_range === "") newFieldErrors.min_range = "Min range is required.";
    if (currentForm.max_range === "") newFieldErrors.max_range = "Max range is required.";
    if (currentForm.price === "") newFieldErrors.price = "Price is required.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      showError("Please fill all required fields.");
      return { ok: false, fieldErrors: newFieldErrors };
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

      const payload = {
        ...currentForm,
        test_name: currentForm.test_name.trim(),
        description: currentForm.description.trim(),
        min_range: Number(currentForm.min_range),
        max_range: Number(currentForm.max_range),
        price: Number(currentForm.price),
      };

      if (editingId) {
        await updateAdminLabTest(editingId, payload);
        setSuccess("Test updated successfully.");
        showSuccess("Test updated successfully.");
      } else {
        await createAdminLabTest(payload);
        setSuccess("Test created successfully.");
        showSuccess("Test created successfully.");
      }

      handleCancelEdit();
      setAddOpen(false);
      await loadTests();

      return { ok: true };
    } catch (err) {
      const data = err.response?.data || {};
      const backendErrors = mapBackendFieldErrors(data);

      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors(backendErrors);
        return { ok: false, fieldErrors: backendErrors };
      }

      const message =
        data?.message ||
        data?.detail ||
        err.message ||
        "Failed to save test";

      setError(message);
      showError(message);

      return { ok: false, message };
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");
      setSuccess("");

      await deleteAdminLabTest(id);

      const message = "Test deleted successfully.";
      setSuccess(message);
      showSuccess(message);

      if (editingId === id) {
        handleCancelEdit();
      }

      await loadTests();
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Failed to delete test";
      setError(message);
      showError(message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Tests (Admin)"
        subtitle="Manage lab tests with clean CRUD controls"
      />

      {success ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-slate-900">All Lab Tests</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search test..."
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
            />

            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />

            <button
              onClick={() => {
                setForm(initialForm);
                setFieldErrors({});
                setEditingId(null);
                setAddOpen(true);
              }}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Lab Test
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
            Loading tests...
          </div>
        ) : !filteredTests.length ? (
          <EmptyState message="No tests found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[950px] table-fixed text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="w-[90px] py-4 pr-4 px-4">Test ID</th>
                  <th className="w-[180px] py-4 pr-4">Name</th>
                  <th className="w-[220px] py-4 pr-4">Description</th>
                  <th className="w-[170px] py-4 pr-4">Range</th>
                  <th className="w-[120px] py-4 pr-4">Price</th>
                  <th className="w-[120px] py-4 pr-4">Status</th>
                  <th className="w-[170px] py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTests.map((test) => (
                  <tr
                    key={test.id}
                    className="border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap py-4 pr-4 px-4 font-semibold text-slate-800">
                      {formatDisplayId("LT", test.id)}
                    </td>

                    <td className="py-4 pr-4">
                      <p
                        className="truncate font-semibold text-slate-900"
                        title={test.test_name}
                      >
                        {test.test_name}
                      </p>
                    </td>

                    <td className="py-4 pr-4">
                      <p
                        className="break-words text-sm text-slate-500"
                        title={test.description || "-"}
                      >
                        {test.description || "-"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap py-4 pr-4 text-slate-700">
                      {`${test.min_range} - ${test.max_range}`}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-4 text-slate-700">
                      {formatINR(test.price)}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-4">
                      <StatusBadge status={test.status} />
                    </td>

                    <td className="whitespace-nowrap py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(test)}
                          className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(test.id)}
                          className="rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
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

      <AddLabTestModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleSubmit}
        onValidateField={handleValidateField}
        submitting={submitting}
        initialValues={initialForm}
      />

      <EditLabTestModal
        isOpen={editOpen}
        onClose={handleCancelEdit}
        onSubmit={handleSubmit}
        submitting={submitting}
        initialValues={form}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}