import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("access");
    const url = config.url || "";

    if (token && !url.includes("auth/login")) {
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
    const isLoginRequest = originalRequest?.url?.includes("auth/login");
    const isRefreshRequest = originalRequest?.url?.includes("auth/token/refresh");

    if (
      isUnauthorized &&
      !originalRequest?._retry &&
      !isLoginRequest &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        const refresh = sessionStorage.getItem("refresh");

        if (!refresh) {
          sessionStorage.clear();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const res = await axios.post(
          "http://127.0.0.1:8000/api/auth/token/refresh/",
          { refresh },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const newAccess = res.data?.access;

        if (!newAccess) {
          throw new Error("Access token not returned from refresh endpoint.");
        }

        sessionStorage.setItem("access", newAccess);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return API(originalRequest);
      } catch (refreshError) {
        sessionStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;