import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../styles/doctorSchedule.css";

import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getDoctors,
} from "../api/adminApi";

import PageHeader from "../components/PageHeader";
import EmptyState from "../../labTechnician/components/EmptyState";
import { showError, showSuccess } from "../../labTechnician/utils/toast";

export default function DoctorSchedule() {
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    doctor: "",
    available_from: "",
    available_to: "",
  });

  useEffect(() => {
    fetchSchedules();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setFiltered(schedules.filter((s) => s.date === selectedDate));
    } else {
      setFiltered([]);
    }
  }, [selectedDate, schedules]);

  const fetchSchedules = async () => {
    try {
      const res = await getSchedules();
      setSchedules(res.data || []);
    } catch {
      showError("Failed to load schedules");
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await getDoctors();
      setDoctors(res.data || []);
    } catch {
      setDoctors([]);
    }
  };

  const handleDateChange = (value) => {
    const d = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    setDate(value);
    setSelectedDate(d);
    setEditing(null);
    setErrors({});
    setForm({ doctor: "", available_from: "", available_to: "" });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      showError("Please select a date first");
      return;
    }

    try {
      setErrors({});
      const payload = { ...form, date: selectedDate };

      if (editing) {
        await updateSchedule(editing.id, payload);
        showSuccess("Schedule updated");
      } else {
        await createSchedule(payload);
        showSuccess("Schedule created");
      }

      fetchSchedules();
      setEditing(null);
      setForm({ doctor: "", available_from: "", available_to: "" });
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        showError("Failed to save schedule");
      }
    }
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({
      doctor: s.doctor,
      available_from: s.available_from || "",
      available_to: s.available_to || "",
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteSchedule(id);
      showSuccess("Schedule deleted");
      fetchSchedules();
    } catch {
      showError("Delete failed");
    }
  };

  const getDoctorName = (id) => {
    const doc = doctors.find((d) => String(d.id) === String(id));
    return doc ? doc.full_name : id;
  };

  const inputClass = (hasError) =>
    `w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:ring-4 ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
    }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Schedule"
        subtitle="Select a date and manage doctor schedules for that day"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Calendar
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              Select Schedule Date
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Pick a date to add or manage doctor availability.
            </p>
          </div>

          <div className="calendar-shell">
            <Calendar
              value={date}
              onChange={handleDateChange}
              minDate={new Date()}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {errors.non_field_errors && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">
                  {errors.non_field_errors[0]}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select
                value={form.doctor}
                onChange={(e) => handleChange("doctor", e.target.value)}
                className={inputClass(errors.doctor)}
              >
                <option value="">Select Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={form.available_from}
                onChange={(e) => handleChange("available_from", e.target.value)}
                className={inputClass(errors.available_from)}
              />

              <input
                type="time"
                value={form.available_to}
                onChange={(e) => handleChange("available_to", e.target.value)}
                className={inputClass(errors.available_to)}
              />

              <button
                onClick={handleSubmit}
                disabled={!selectedDate}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {editing ? "Update" : "Add"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">
              {selectedDate ? `Schedules for ${selectedDate}` : "Select a date"}
            </h3>

            {!selectedDate ? (
              <EmptyState message="Select a date to view schedules." />
            ) : !filtered.length ? (
              <EmptyState message="No schedules found for this date." />
            ) : (
              <div className="space-y-3">
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {getDoctorName(s.doctor)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {s.available_from || "-"} to {s.available_to || "-"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}