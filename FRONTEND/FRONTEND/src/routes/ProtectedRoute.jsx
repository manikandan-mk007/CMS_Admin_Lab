import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const isValidObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const ProtectedRoute = ({ children, role }) => {
  const auth = useContext(AuthContext);

  if (!isValidObject(auth)) {
    return <Navigate to="/login" replace />;
  }

  const user = auth.user;

  if (!isValidObject(user)) {
    return <Navigate to="/login" replace />;
  }

  const userRole = typeof user.role === "string" ? user.role : "";

  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children ?? null;
};

export default ProtectedRoute;