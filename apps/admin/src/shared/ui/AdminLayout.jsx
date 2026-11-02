import { Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useChat } from "../chat/ChatContext.jsx";

export default function AdminLayout() {
  const { openChat } = useChat();

  return (
    <>
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
