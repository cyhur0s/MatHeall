import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ role, children }) {
  const location = useLocation();
  const username = localStorage.getItem("username");
  const currentRole = localStorage.getItem("role");
  const token = localStorage.getItem("auth_token");

  if (!username || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && currentRole !== role) {
    return <Navigate to={currentRole === "admin" ? "/admin" : "/home"} replace />;
  }

  return children;
}
