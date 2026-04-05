import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/authApi";
import { AuthContext } from "../context/AuthContext";
import { showError, showSuccess } from "../modules/labTechnician/utils/toast";
import bgImage from "../assets/images.jfif";

const Login = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const debounceRef = useRef(null);

  const isFormValid = useMemo(() => {
    return form.username.trim() !== "" && form.password.trim() !== "";
  }, [form]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.username.trim()) {
      newErrors.username = "Username is required.";
    }

    if (!form.password.trim()) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 4) {
      newErrors.password = "Password must be at least 4 characters.";
    }

    return newErrors;
  };

  const extractBackendError = (error) => {
    const data = error?.response?.data;

    if (error?.message === "Network error. Please check your server connection.") {
      return error.message;
    }

    if (!data) {
      return "Unable to connect to server. Please try again.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data.detail) {
      return data.detail;
    }

    if (data.non_field_errors?.length) {
      return data.non_field_errors[0];
    }

    if (data.error) {
      return data.error;
    }

    if (data.message) {
      return data.message;
    }

    return "Login failed. Please check your credentials.";
  };

  const applyBackendFieldErrors = (error) => {
    const data = error?.response?.data;

    if (!data || typeof data !== "object") return false;

    const fieldErrors = {};

    if (Array.isArray(data.username) && data.username.length > 0) {
      fieldErrors.username = data.username[0];
    }

    if (Array.isArray(data.password) && data.password.length > 0) {
      fieldErrors.password = data.password[0];
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      return true;
    }

    return false;
  };

  const validateLoginInstantly = async (payload) => {
    try {
      setIsChecking(true);

      await loginApi(payload);

      setErrors((prev) => ({
        ...prev,
        username: "",
        password: "",
      }));
      setBackendError("");
    } catch (error) {
      const hasFieldErrors = applyBackendFieldErrors(error);

      if (!hasFieldErrors) {
        const message = extractBackendError(error);
        setBackendError(message);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const updatedForm = {
      ...form,
      [name]: value,
    };

    setForm(updatedForm);

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setBackendError("");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const username = updatedForm.username.trim();
    const password = updatedForm.password;

    if (!username || !password || password.length < 4) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      validateLoginInstantly({
        username,
        password,
      });
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);
    setBackendError("");

    if (Object.keys(validationErrors).length > 0) {
      showError("Please fix the form errors.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        username: form.username.trim(),
        password: form.password,
      };

      const res = await loginApi(payload);
      const redirectPath = login(res.data);

      showSuccess("Login successful");
      navigate(redirectPath);
    } catch (error) {
      const hasFieldErrors = applyBackendFieldErrors(error);

      const message = extractBackendError(error);
      setBackendError(message);

      if (!hasFieldErrors) {
        showError(message);
      } else {
        showError("Please check your username and password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900">
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14 text-white">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                Clinic Management System
              </div>
            </div>

            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="mb-8 overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
                <img
                  src={bgImage}
                  alt="Clinic"
                  className="w-full max-w-md rounded-2xl object-cover"
                />
              </div>

              <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                Manage your clinic with clarity and control
              </h1>

              <p className="mt-5 max-w-lg text-base text-blue-100 xl:text-lg">
                Access staff management, doctor records, reports, billing, and
                lab workflows from one clean dashboard.
              </p>

              <div className="mt-10 grid w-full grid-cols-3 gap-4 text-left">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold">Admin</p>
                  <p className="mt-1 text-sm text-blue-100">Control users and operations</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold">Doctor</p>
                  <p className="mt-1 text-sm text-blue-100">Manage patients and care</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold">Lab</p>
                  <p className="mt-1 text-sm text-blue-100">Track tests and reports</p>
                </div>
              </div>
            </div>

            <div className="text-sm text-blue-100/80">
              Secure role-based access for clinic teams
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                Clinic Management System
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to continue to your dashboard
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="mb-8 hidden lg:block">
                <h2 className="text-3xl font-bold text-slate-900">Sign in</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter your account credentials to access the CMS.
                </p>
              </div>

              {backendError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {backendError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={handleChange}
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                      errors.username
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {errors.username && (
                    <p className="mt-2 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                      errors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isChecking || !isFormValid}
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSubmitting ? "Signing in..." : isChecking ? "Checking..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Use your assigned clinic account credentials to continue.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;