import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminRole, SessionContext } from "../session/SessionContext.jsx";

export default function AdminLayout() {
  const { admin, loading, logout } = useContext(SessionContext);
  const location = useLocation();
  if (loading) return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if (!admin || !isAdminRole(admin.role)) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return (
    <>
      <div className="flex justify-end items-center gap-4 px-6 py-3 bg-white border-b border-emerald-100">
        <span>{admin.name}</span>
        <button
          type="button"
          onClick={logout}
          className="text-red-700 font-medium"
        >
          Đăng xuất
        </button>
      </div>
      <Outlet />
    </>
  );
}
