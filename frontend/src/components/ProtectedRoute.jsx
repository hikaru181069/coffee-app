import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken } from "../utils/authStorage";

function ProtectedRoute() {
  const token = getAuthToken();
  if (!token) return <Navigate to="/landing" replace />;
  return <Outlet />;
}

export default ProtectedRoute;
