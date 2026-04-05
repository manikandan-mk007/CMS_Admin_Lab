import API from "../../../api/axios";

/**
 * Small guards to avoid sending obviously broken requests.
 * These do not change your API logic, they only fail early with clear errors.
 */

const assertId = (id, label = "ID") => {
  if (id === null || id === undefined || id === "") {
    throw new Error(`${label} is required`);
  }
};

const assertObject = (data, label = "Request data") => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${label} must be a valid object`);
  }
};

const cleanParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

// ======================
// STAFF
// ======================
export const getStaff = (isActive = true) =>
  API.get("manager/staff/", {
    params: cleanParams({ is_active: isActive }),
  });

export const createStaff = (data) => {
  assertObject(data, "Staff data");
  return API.post("manager/staff/", data);
};

export const updateStaff = (id, data) => {
  assertId(id, "Staff ID");
  assertObject(data, "Staff data");
  return API.put(`manager/staff/${id}/`, data);
};

export const editStaff = (id, data) => {
  assertId(id, "Staff ID");
  assertObject(data, "Staff data");
  return API.patch(`manager/staff/${id}/`, data);
};

export const deactivateStaff = (id) => {
  assertId(id, "Staff ID");
  return API.delete(`manager/staff/${id}/`);
};

export const restoreStaff = (id) => {
  assertId(id, "Staff ID");
  return API.patch(`manager/staff/${id}/restore/`);
};

// staff instant validation
export const validateStaffField = (data) => {
  assertObject(data, "Staff validation data");
  return API.post("manager/staff/validate/", data);
};

export const validateEditStaffField = (id, data) => {
  assertId(id, "Staff ID");
  assertObject(data, "Staff validation data");
  return API.post(`manager/staff/${id}/validate/`, data);
};

// ======================
// SPECIALIZATION
// ======================
export const getSpecializations = () =>
  API.get("manager/specializations/");

export const createSpecialization = (data) => {
  assertObject(data, "Specialization data");
  return API.post("manager/specializations/", data);
};

export const updateSpecialization = (id, data) => {
  assertId(id, "Specialization ID");
  assertObject(data, "Specialization data");
  return API.put(`manager/specializations/${id}/`, data);
};

export const deleteSpecialization = (id) => {
  assertId(id, "Specialization ID");
  return API.delete(`manager/specializations/${id}/`);
};

// specialization instant validation
export const validateSpecializationField = (data) => {
  assertObject(data, "Specialization validation data");
  return API.post("manager/specializations/validate-field/", data);
};

// ======================
// DOCTORS
// ======================
export const getDoctors = () =>
  API.get("manager/doctors/");

export const createDoctor = (data) => {
  assertObject(data, "Doctor data");
  return API.post("manager/doctors/", data);
};

export const updateDoctor = (id, data) => {
  assertId(id, "Doctor ID");
  assertObject(data, "Doctor data");
  return API.put(`manager/doctors/${id}/`, data);
};

export const deactivateDoctor = (id) => {
  assertId(id, "Doctor ID");
  return API.delete(`manager/doctors/${id}/`);
};

export const restoreDoctor = (id) => {
  assertId(id, "Doctor ID");
  return API.patch(`manager/doctors/${id}/restore/`);
};

export const getAvailability = (id, date) => {
  assertId(id, "Doctor ID");
  if (!date) {
    throw new Error("Date is required");
  }

  return API.get(`manager/doctors/${id}/availability/`, {
    params: cleanParams({ date }),
  });
};

// doctor instant validation
export const validateDoctorField = (data) => {
  assertObject(data, "Doctor validation data");
  return API.post("manager/doctors/validate-field/", data);
};

// ======================
// DOCTOR SCHEDULE
// ======================
export const getSchedules = () =>
  API.get("manager/doctor-schedules/");

export const createSchedule = (data) => {
  assertObject(data, "Schedule data");
  return API.post("manager/doctor-schedules/", data);
};

export const updateSchedule = (id, data) => {
  assertId(id, "Schedule ID");
  assertObject(data, "Schedule data");
  return API.put(`manager/doctor-schedules/${id}/`, data);
};

export const deleteSchedule = (id) => {
  assertId(id, "Schedule ID");
  return API.delete(`manager/doctor-schedules/${id}/`);
};

// ======================
// HOSPITAL SETTINGS
// ======================
export const getSettings = () =>
  API.get("manager/hospital-settings/");

export const updateSettings = (id, data) => {
  assertId(id, "Settings ID");
  assertObject(data, "Settings data");
  return API.put(`manager/hospital-settings/${id}/`, data);
};

export const createSettings = (data) => {
  assertObject(data, "Settings data");
  return API.post("manager/hospital-settings/", data);
};

// ======================
// GROUPS / ROLES
// ======================
export const getRoles = () =>
  API.get("manager/groups/");

// ======================
// LAB TESTS
// Admin manages lab tests
// ======================
export const getAdminLabTests = (params = {}) =>
  API.get("lab-tech/lab-tests/", {
    params: cleanParams(params),
  });

export const createAdminLabTest = (data) => {
  assertObject(data, "Lab test data");
  return API.post("lab-tech/lab-tests/", data);
};

export const updateAdminLabTest = (id, data) => {
  assertId(id, "Lab test ID");
  assertObject(data, "Lab test data");
  return API.patch(`lab-tech/lab-tests/${id}/`, data);
};

export const deleteAdminLabTest = (id) => {
  assertId(id, "Lab test ID");
  return API.delete(`lab-tech/lab-tests/${id}/`);
};

// lab test instant validation
export const validateLabTestField = (data) => {
  assertObject(data, "Lab test validation data");
  return API.post("lab-tech/lab-tests/validate-field/", data);
};