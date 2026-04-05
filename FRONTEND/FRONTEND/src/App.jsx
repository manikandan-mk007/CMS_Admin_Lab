import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Home from "./pages/Home";
import ProtectedRoute from "./routes/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";

import AdminRoutes from "./modules/admin/routes";
import LabTechnicianRoutes from "./modules/labTechnician/routes";

const SafeElement = ({ children, fallback = null }) => {
  return children ?? fallback;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="colored"
        />

        <Routes>
          <Route
            path="/"
            element={
              <SafeElement fallback={<Navigate to="/login" replace />}>
                <Home />
              </SafeElement>
            }
          />

          <Route
            path="/login"
            element={
              <SafeElement fallback={<Navigate to="/" replace />}>
                <Login />
              </SafeElement>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute role="Admin">
                <SafeElement fallback={<Navigate to="/" replace />}>
                  <AdminRoutes />
                </SafeElement>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lab-technician/*"
            element={
              <ProtectedRoute role="LabTechnician">
                <SafeElement fallback={<Navigate to="/" replace />}>
                  <LabTechnicianRoutes />
                </SafeElement>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;