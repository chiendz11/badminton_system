import React, { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";

// Import APIs

import { updateAvatar } from "../../users/api/user_service/rest/user.api.js";

import { FaUserShield, FaKey, FaCamera, FaSave, FaTimes } from "react-icons/fa";
import { GiShuttlecock } from "react-icons/gi";
import { MdEmail, MdPhone } from "react-icons/md";

const Account = () => {
  // Lấy admin và setAdmin từ SessionContext
  const { admin, setAdmin } = useContext(SessionContext);

  const DEFAULT_AVATAR_URL =
    "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  // Hàm helper lấy đường dẫn ảnh
  const getAvatarImagePath = (path) => {
    if (path && path.trim() !== "") {
      return path;
    }
    return DEFAULT_AVATAR_URL;
  };

  // --- STATE QUẢN LÝ AVATAR ---
  const [avatarFile, setAvatarFile] = useState(null);

  // Khởi tạo preview từ admin.avatar hiện tại
  const [preview, setPreview] = useState(getAvatarImagePath(admin?.avatar_url));
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // --- STATE QUẢN LÝ MẬT KHẨU ---

  // 💡 QUAN TRỌNG: Đồng bộ Preview khi admin context thay đổi (VD: sau khi F5 xong và SessionContext fetch xong data)
  useEffect(() => {
    // Chỉ cập nhật preview từ context nếu người dùng KHÔNG đang chọn file mới
    if (!avatarFile) {
      setPreview(getAvatarImagePath(admin?.avatar_url));
    }
  }, [admin, avatarFile]);

  // --- HANDLERS: AVATAR ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh hợp lệ!");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 5MB!");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!avatarFile) return;
    setLoadingAvatar(true);
    try {
      const result = await updateAvatar(avatarFile);
      toast.success("Cập nhật ảnh đại diện thành công! 🏸");

      // Lấy URL mới từ response
      let newAvatarUrl = result.data?.avatar_url || result.avatar_url;

      // Nếu API trả về URL, ta cập nhật ngay vào Context
      if (newAvatarUrl) {
        // Mẹo: Thêm timestamp để tránh browser cache nếu URL không đổi
        // newAvatarUrl = `${newAvatarUrl}?t=${new Date().getTime()}`;

        setAdmin((prev) => ({
          ...prev,
          avatar: newAvatarUrl,
        }));

        // Cập nhật lại preview ngay lập tức để UI mượt mà
        setPreview(newAvatarUrl);
      }

      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Lỗi khi cập nhật ảnh đại diện",
      );
    } finally {
      setLoadingAvatar(false);
    }
  };

  const cancelAvatarChange = () => {
    setAvatarFile(null);
    setPreview(getAvatarImagePath(admin?.avatar_url));
  };

  // --- HANDLERS: PASSWORD ---

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-green-800 flex items-center justify-center gap-3">
            <FaUserShield className="text-4xl" />
            Quản Lý Tài Khoản
          </h1>
          <p className="mt-2 text-gray-600">
            Cập nhật thông tin cá nhân và bảo mật tài khoản của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* CỘT TRÁI: THÔNG TIN & AVATAR */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="h-24 bg-gradient-to-r from-green-600 to-green-800"></div>

              <div className="px-6 pb-6 text-center relative">
                <div className="relative -mt-12 w-32 h-32 mx-auto">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200 group">
                    {/* Dùng key để force re-render ảnh khi URL thay đổi nếu cần */}
                    <img
                      key={preview}
                      src={preview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <FaCamera className="text-white text-2xl" />
                    </label>
                  </div>
                  <span
                    className="absolute bottom-1 right-1 w-5 h-5 bg-green-50 border-2 border-white rounded-full"
                    title="Online"
                  ></span>
                </div>

                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <h2 className="mt-4 text-xl font-bold text-gray-800">
                  {admin?.name || "Admin User"}
                </h2>
                <p className="text-sm text-green-600 font-semibold mb-1 flex items-center justify-center gap-1">
                  <GiShuttlecock className="text-lg" />{" "}
                  {admin?.role || "Quản trị viên"}
                </p>
                <p className="text-xs text-gray-400">
                  ID: {admin?._id || "unknown"}
                </p>

                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center text-gray-600 text-sm p-3 bg-gray-50 rounded-lg">
                    <MdEmail className="text-green-600 mr-3 text-lg" />
                    <span className="truncate">
                      {admin?.email || "email@example.com"}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm p-3 bg-gray-50 rounded-lg">
                    <MdPhone className="text-green-600 mr-3 text-lg" />
                    <span>{admin?.phone_number || "Chưa cập nhật SĐT"}</span>
                  </div>
                </div>

                {avatarFile && (
                  <div className="mt-4 flex gap-2 animate-fade-in-up">
                    <button
                      onClick={handleUpdateAvatar}
                      disabled={loadingAvatar}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {loadingAvatar ? (
                        "Đang lưu..."
                      ) : (
                        <>
                          <FaSave /> Lưu ảnh
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelAvatarChange}
                      className="flex-none bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition"
                      title="Hủy bỏ"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: ĐỔI MẬT KHẨU */}
        </div>
      </div>
    </div>
  );
};

export default Account;
