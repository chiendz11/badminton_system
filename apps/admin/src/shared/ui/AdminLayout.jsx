import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { isAdminRole, SessionContext } from "../session/SessionContext.jsx";
import { useChat } from "../chat/ChatContext.jsx";

export default function AdminLayout() {
  const { admin, loading, logout } = useContext(SessionContext) || {};
  const { openChat } = useChat();
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
          className="text-red-700 font-medium cursor-pointer"
        >
          Đăng xuất
        </button>
      </div>
      <Outlet />

      {/* Floating Amazon Q style button in Admin */}
      <button
        type="button"
        onClick={openChat}
        className="fixed bottom-6 right-6 z-[9980] flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Mở Trợ lý AI ĐẶT SÂN 247 (Amazon Q style)"
        aria-label="Trợ lý AI ĐẶT SÂN 247"
      >
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
          <Sparkles size={20} className="text-emerald-400" />
        </div>
      </button>
    </>
  );
}
