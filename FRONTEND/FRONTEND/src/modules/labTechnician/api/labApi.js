import API from "../../../api/axios";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const assertId = (id, label = "ID") => {
  if (id === null || id === undefined || id === "") {
    throw new Error(`${label} is required`);
  }
};

const assertObject = (data, label = "Data") => {
  if (!isPlainObject(data)) {
    throw new Error(`${label} must be a valid object`);
  }
};

const cleanParams = (params = {}) => {
  if (!isPlainObject(params)) return {};
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getErrorMessage = (data) => {
  if (!data) return "Request failed";

  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  if (Array.isArray(data.non_field_errors)) {
    return data.non_field_errors.join(" ");
  }

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue)) return firstValue.join(" ");
  if (typeof firstValue === "string") return firstValue;

  return "Request failed";
};

const request = async (method, url, options = {}) => {
  try {
    const response = await API({
      method,
      url,
      ...options,
      params: cleanParams(options.params || {}),
    });

    return response.data;
  } catch (error) {
    const err = new Error(
      getErrorMessage(error.response?.data || null) || "Request failed"
    );

    err.status = error.response?.status;
    err.responseData = error.response?.data || null;
    err.response = error.response || null;
    throw err;
  }
};

const downloadBlob = async (url, filename) => {
  if (!url) {
    throw new Error("Download URL is required");
  }

  const safeFilename = filename || "download";

  try {
    const response = await API.get(url, { responseType: "blob" });
    const blob = response.data;

    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    const err = new Error(
      getErrorMessage(error.response?.data || null) || "Download failed"
    );
    err.status = error.response?.status;
    err.responseData = error.response?.data || null;
    err.response = error.response || null;
    throw err;
  }
};

export const labApi = {
  getDashboardStats: () =>
    request("get", "lab-tech/dashboard/stats/"),

  getAbnormalAlerts: () =>
    request("get", "lab-tech/alerts/abnormal-reports/"),

  getConsultationLabSummary: (consultationId) => {
    assertId(consultationId, "Consultation ID");
    return request("get", `lab-tech/consultations/${consultationId}/lab-summary/`);
  },

  getLabPrescriptions: async (params = {}) => {
    const data = await request("get", "lab-tech/lab-prescriptions/", {
      params: { page_size: 100, ...cleanParams(params) },
    });
    return { items: normalizeList(data), raw: data };
  },

  getLabTests: async (params = {}) => {
    const data = await request("get", "lab-tech/lab-tests/", {
      params: cleanParams(params),
    });
    return { items: normalizeList(data), raw: data };
  },

  getLabReports: async (params = {}) => {
    const data = await request("get", "lab-tech/lab-reports/", {
      params: cleanParams(params),
    });
    return { items: normalizeList(data), raw: data };
  },

  getLabReportDetail: (id) => {
    assertId(id, "Report ID");
    return request("get", `lab-tech/lab-reports/${id}/`);
  },

  createLabReport: (payload) => {
    assertObject(payload, "Lab report payload");
    return request("post", "lab-tech/lab-reports/", { data: payload });
  },

  markReportComplete: (id, payload = {}) => {
    assertId(id, "Report ID");
    if (!isPlainObject(payload)) {
      throw new Error("Payload must be a valid object");
    }

    return request("post", `lab-tech/lab-reports/${id}/mark-complete/`, {
      data: payload,
    });
  },

  downloadLabReportPdf: async (id) => {
    assertId(id, "Report ID");
    await downloadBlob(
      `lab-tech/lab-reports/${id}/download-pdf/`,
      `lab_report_${id}.pdf`
    );
  },

  getLabBillings: async (params = {}) => {
    const data = await request("get", "lab-tech/lab-billings/", {
      params: cleanParams(params),
    });
    return { items: normalizeList(data), raw: data };
  },

  getLabBillingDetail: (id) => {
    assertId(id, "Billing ID");
    return request("get", `lab-tech/lab-billings/${id}/`, {
      params: { detailed: true },
    });
  },

  markBillPaid: (id) => {
    assertId(id, "Billing ID");
    return request("post", `lab-tech/lab-billings/${id}/mark-paid/`);
  },

  downloadLabBillingPdf: async (id) => {
    assertId(id, "Billing ID");
    await downloadBlob(
      `lab-tech/lab-billings/${id}/download-pdf/`,
      `lab_billing_${id}.pdf`
    );
  },
  validateLabReportField: (payload) => {
    assertObject(payload, "Validation payload");
    return request("post", "lab-tech/lab-reports/validate-field/", {
      data: payload,
    });
  },
};

