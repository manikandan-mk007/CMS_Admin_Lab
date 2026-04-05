import { toast } from "react-toastify";

const baseConfig = {
  position: "top-right",
  autoClose: 2500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const getStyle = (type) => {
  const styles = {
    success: {
      background: "#ecfdf5",
      color: "#065f46",
      border: "1px solid #6ee7b7",
    },
    error: {
      background: "#fef2f2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    },
    info: {
      background: "#eff6ff",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    },
    warning: {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    },
  };

  return {
    ...styles[type],
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 500,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  };
};

export const showSuccess = (message) => {
  toast.success(message || "Success", {
    ...baseConfig,
    style: getStyle("success"),
  });
};

export const showError = (message) => {
  toast.error(message || "Something went wrong", {
    ...baseConfig,
    style: getStyle("error"),
  });
};

export const showInfo = (message) => {
  toast.info(message || "Info", {
    ...baseConfig,
    style: getStyle("info"),
  });
};

export const showWarning = (message) => {
  toast.warning(message || "Warning", {
    ...baseConfig,
    style: getStyle("warning"),
  });
};