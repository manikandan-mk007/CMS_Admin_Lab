import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("access");
    const url = config.url || "";

    if (token && !url.includes("auth/login")) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject({
        ...error,
        message: "Network error. Please check your server connection.",
      });
    }

    const isUnauthorized = error.response.status === 401;
    const requestUrl = originalRequest?.url || "";
    const isLoginRequest = requestUrl.includes("auth/login");
    const isRefreshRequest = requestUrl.includes("auth/token/refresh");

    if (
      isUnauthorized &&
      !originalRequest?._retry &&
      !isLoginRequest &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        const res = await API.post("auth/token/refresh/", {});

        const newAccess = res.data?.access;

        if (!newAccess) {
          throw new Error("Access token not returned from refresh endpoint.");
        }

        sessionStorage.setItem("access", newAccess);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return API(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem("access");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;