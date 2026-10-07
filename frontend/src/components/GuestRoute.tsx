import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export function GuestRoute() {
  const user = useAuthStore((state) => state.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
