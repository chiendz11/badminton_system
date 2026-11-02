import React, { useState } from "react";
import { LogIn, UserCheck, X } from "lucide-react";
import { useChat } from "../../../shared/chat/ChatContext.jsx";

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, handleLoginSuccess } = useChat();
  const [username, setUsername] = useState("Nguyễn Văn A");
  const [email, setEmail] = useState("nguyenvana@gmail.com");

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLoginSuccess({
      userId: "user-1",
      name: username || "Nguyễn Văn A",
      email: email || "nguyenvana@gmail.com",
      role: "user",
      avatar_url: "/images/user_avatar.png",
    });
  };

  const handleQuickLogin = () => {
    handleLoginSuccess({
      userId: "user-1",
      name: "Nguyễn Văn A",
      email: "nguyenvana@gmail.com",
      role: "user",
      avatar_url: "/images/user_avatar.png",
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-inner">
            <LogIn size={24} />
          </div>
          <h3 id="login-modal-title" className="text-xl font-bold text-gray-900">
            Đăng nhập ĐẶT SÂN 247
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Đăng nhập để đặt sân và kích hoạt Trợ lý ảo AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Nhập họ và tên..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Email / Số điện thoại
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              Đăng nhập & Tiếp tục
            </button>

            <button
              type="button"
              onClick={handleQuickLogin}
              className="w-full py-2 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserCheck size={16} />
              Đăng nhập nhanh với tài khoản Demo
            </button>

            <button
              type="button"
              onClick={closeLoginModal}
              className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

