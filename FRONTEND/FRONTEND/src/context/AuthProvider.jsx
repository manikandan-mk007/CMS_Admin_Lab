import { useState } from "react";
import { AuthContext } from "./AuthContext";
import API from "../api/axios";   // ✅ import your axios instance

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user")) || null
  );

  const login = (data) => {
    sessionStorage.setItem("access", data.tokens.access);
    // ✅ Removed: sessionStorage.setItem("refresh", data.tokens.refresh);
    // Refresh token is now in HttpOnly cookie set by server automatically
    sessionStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    const roleRoutes = {
      Admin: "/admin",
      Doctor: "/doctor",
      Receptionist: "/receptionist",
      LabTechnician: "/lab-technician",
      Pharmacist: "/pharmacist",
    };

    return roleRoutes[data.user.role] || "/";
  };

  const logout = async () => {
    try {
      // ✅ Tell server to blacklist refresh token and clear cookie
      await API.post("auth/logout/");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // ✅ Always clear local storage and user state
      sessionStorage.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};