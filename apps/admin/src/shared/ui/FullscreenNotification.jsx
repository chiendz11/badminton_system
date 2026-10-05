import React, { useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const FullscreenNotification = ({
  type = "success",
  title,
  message,
  onClose,
}) => {
  // Tự động đóng sau 3 giây (tùy chọn)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2500); // Thời gian hiển thị
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="text-center max-w-md px-6 animate-in zoom-in duration-300 slide-in-from-bottom-10">
        {type === "success" ? (
          <CheckCircleIcon className="w-24 h-24 text-green-500 mx-auto mb-6 drop-shadow-lg" />
        ) : (
          <XCircleIcon className="w-24 h-24 text-red-500 mx-auto mb-6 drop-shadow-lg" />
        )}

        <h2
          className={`text-3xl font-bold mb-3 ${type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {title}
        </h2>

        <p className="text-gray-600 text-lg font-medium leading-relaxed">
          {message}
        </p>

        <button
          onClick={onClose}
          className="mt-8 px-8 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default FullscreenNotification;
