import React from "react";
import { Lock, X } from "lucide-react";
import { useChat } from "../context/ChatContext.jsx";

export default function LoginPromptModal() {
  const { isLoginPromptOpen, closeLoginPrompt, goToLogin } = useChat();

  if (!isLoginPromptOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 transform transition-all">
        {/* Close Button */}
        <button
          onClick={closeLoginPrompt}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
            <Lock size={28} />
          </div>

          <h3
            id="login-prompt-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            Yêu cầu đăng nhập
          </h3>

          <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
            Bạn hãy đăng nhập để sử dụng trợ lý AI và thực hiện đặt sân nhanh chóng.
          </p>
        </div>

        {/* 2 Buttons as requested: Đi đăng nhập hoặc Hủy */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={closeLoginPrompt}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={goToLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
          >
            Đi đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}

