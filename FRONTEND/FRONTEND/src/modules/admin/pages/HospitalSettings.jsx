import { useEffect, useState } from "react";
import {
  getSettings,
  updateSettings,
  createSettings,
} from "../api/adminApi";
import PageHeader from "../components/PageHeader";
import { showError, showSuccess } from "../../labTechnician/utils/toast";


const HospitalSettings = () => {
  const [settings, setSettings] = useState(null);
  const [fee, setFee] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      const data = Array.isArray(res.data) ? res.data[0] : res.data;

      if (!data) {
        setSettings(null);
        setFee("");
        return;
      }

      setSettings(data);
      setFee(data.registration_fee ?? "");
    } catch (err) {
      showError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (fee === "" || fee === null) {
      newErrors.registration_fee = ["Registration fee is required"];
    } else if (Number(fee) < 0) {
      newErrors.registration_fee = ["Fee must be positive"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setErrors({});

      const payload = {
        registration_fee: fee,
      };

      if (settings?.id) {
        await updateSettings(settings.id, payload);
        showSuccess("Updated successfully");
      } else {
        await createSettings(payload);
        showSuccess("Created successfully");
      }

      fetchSettings();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        showError("Operation failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Settings"
        subtitle="Manage registration fee and basic hospital configuration"
      />

      {loading ? (
        <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700">
          Loading hospital settings...
        </div>
      ) : (
        <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-5 text-white">
            <p className="text-sm text-blue-100">Configuration</p>
            <h2 className="mt-1 text-2xl font-bold">Hospital Settings</h2>
            <p className="mt-2 text-sm text-blue-100">
              {settings
                ? "Update your clinic registration fee"
                : "Create your hospital registration fee"}
            </p>
          </div>

          {!settings && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                No settings found. Create a new one below.
              </p>
            </div>
          )}

          {errors.non_field_errors && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">
                {errors.non_field_errors[0]}
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Registration Fee
            </label>

            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="Enter registration fee"
              className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 outline-none transition focus:bg-white focus:ring-4 ${
                errors.registration_fee
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            {errors.registration_fee && (
              <p className="mt-2 text-sm text-red-500">
                {errors.registration_fee[0]}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : settings ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalSettings;