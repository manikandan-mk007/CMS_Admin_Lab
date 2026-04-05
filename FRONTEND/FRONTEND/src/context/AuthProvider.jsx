import { useState } from "react";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user")) || null
  );

  const login = (data) => {
    sessionStorage.setItem("access", data.tokens.access);
    sessionStorage.setItem("refresh", data.tokens.refresh);
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

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};