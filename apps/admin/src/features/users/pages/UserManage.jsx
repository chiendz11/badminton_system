import React, { useState, useEffect } from "react";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClockIcon, // Icon cho Spam thời gian
  ExclamationTriangleIcon, // Icon cảnh báo vi phạm
} from "@heroicons/react/24/outline";
import { getAllUsers } from "../api/user_service/rest/user.api.js";
import { updateUserStatus } from "../api/user-status.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  faDumbbell,
  faCoins,
  faMedal,
  faTrophy,
  faGem,
  faCrown,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";

// Helper: Format Date VN
const formatDateVN = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function UserManage() {
  const navigate = useNavigate();

  // 1. DATA STATE
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2. FILTER & PAGINATION STATE
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState(null);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 500);

  const [rankFilter, setRankFilter] = useState("");
  const [sortName, setSortName] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // 3. FETCH DATA
  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        role: "USER",
        search: debouncedSearch,
        level: rankFilter === "Tất cả" ? "" : rankFilter,
        sort: sortName === "none" ? "" : "name",
        order: sortName === "desc" ? "desc" : "asc",
        isActive: statusFilter,
      };

      const response = await getAllUsers(params);

      if (response.success) {
        setCustomers(response.data);
        setPagination(response.pagination);
        setError(null);
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (err) {
      setError("Lỗi kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, rankFilter, sortName, statusFilter]);

  // Reset page về 1 khi filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rankFilter, sortName, statusFilter]);

  // 4. ACTION HANDLER
  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;
    const actionText = newStatus ? "MỞ KHÓA" : "KHÓA";

    // Cảnh báo gắt hơn nếu user đã vi phạm nhiều lần
    let confirmMsg = `Xác nhận ${actionText} tài khoản ${user.name}?`;
    if (!newStatus && user.violationCount >= 3) {
      confirmMsg += `\n⚠️ CẢNH BÁO: User này đã vi phạm ${user.violationCount} lần!`;
    }

    if (!window.confirm(confirmMsg)) return;

    // Optimistic Update
    const previousCustomers = [...customers];
    const updatedCustomers = customers.map((c) =>
      c.userId === user.userId || c._id === user._id
        ? { ...c, isActive: newStatus }
        : c,
    );
    setCustomers(updatedCustomers);

    try {
      await updateUserStatus(user.userId || user._id, newStatus);
      toast.success(`Đã ${actionText.toLowerCase()} thành công!`);
    } catch (error) {
      setCustomers(previousCustomers);
      toast.error(`Lỗi: Không thể ${actionText.toLowerCase()} tài khoản.`);
    }
  };

  const getLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
      case "sắt":
        return (
          <FontAwesomeIcon icon={faDumbbell} className="ml-1 text-gray-500" />
        );
      case "đồng":
        return (
          <FontAwesomeIcon icon={faCoins} className="ml-1 text-orange-400" />
        );
      case "bạc":
        return (
          <FontAwesomeIcon icon={faMedal} className="ml-1 text-gray-400" />
        );
      case "vàng":
        return (
          <FontAwesomeIcon icon={faTrophy} className="ml-1 text-yellow-500" />
        );
      case "bạch kim":
        return <FontAwesomeIcon icon={faGem} className="ml-1 text-cyan-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full font-sans">
      <div className="bg-white w-full shadow-lg overflow-hidden flex flex-col min-h-screen">
        {/* --- HEADER --- */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white flex items-center p-4 shadow-md shrink-0">
          <button
            onClick={() => navigate("/dashboard")}
            className="mr-3 hover:bg-white/20 p-1 rounded-full transition"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold flex-1 tracking-wide">
            QUẢN LÝ KHÁCH HÀNG
          </h1>
        </div>

        {/* --- TOOLBAR --- */}
        <div className="flex items-center p-4 bg-white border-b border-gray-100 space-x-3 shrink-0 flex-wrap gap-y-3 shadow-sm z-10">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px] group">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5 group-focus-within:text-green-600 transition-colors" />
            <input
              type="text"
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all shadow-sm"
              placeholder="Tìm kiếm theo tên, email, sđt..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <div className="relative">
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white shadow-sm cursor-pointer hover:border-green-400 transition-colors appearance-none"
              >
                <option value="">🏆 Tất cả hạng</option>
                <option value="Sắt">Sắt</option>
                <option value="Đồng">Đồng</option>
                <option value="Bạc">Bạc</option>
                <option value="Vàng">Vàng</option>
                <option value="Bạch kim">Bạch kim</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white shadow-sm cursor-pointer hover:border-green-400 transition-colors appearance-none"
              >
                <option value="">⚙️ Trạng thái</option>
                <option value="true">Hoạt động</option>
                <option value="false">Đã khóa</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={sortName}
                onChange={(e) => setSortName(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white shadow-sm cursor-pointer hover:border-green-400 transition-colors appearance-none"
              >
                <option value="none">🔃 Mặc định</option>
                <option value="asc">A - Z</option>
                <option value="desc">Z - A</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- TABLE CONTENT --- */}
        <div className="bg-gray-50 flex-1 overflow-auto relative">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500 animate-pulse">
              <FontAwesomeIcon
                icon={faCrown}
                className="text-4xl mb-4 text-green-200"
              />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-64 text-red-500">
              <ExclamationTriangleIcon className="h-10 w-10 mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="w-full table-auto text-sm bg-white">
                <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 text-left">Khách hàng</th>
                    <th className="py-3 px-4 text-left">Hạng & Điểm</th>
                    <th className="py-3 px-4 text-left">Liên hệ</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-12 text-gray-400"
                      >
                        <MagnifyingGlassIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  ) : (
                    customers.map((item, index) => {
                      // Logic màu nền thông minh
                      let rowClass =
                        "hover:bg-gray-50 transition-colors duration-150";
                      if (!item.isActive)
                        rowClass += " bg-red-50/60 hover:bg-red-100/50";
                      else if (item.isSpamming)
                        rowClass += " bg-yellow-50/60 hover:bg-yellow-100/50";

                      return (
                        <tr key={item._id || item.userId} className={rowClass}>
                          <td className="py-3 px-4 text-center text-gray-400">
                            {(page - 1) * limit + index + 1}
                          </td>

                          {/* Cột Tên & Vi phạm */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 flex items-center gap-2">
                                {item.name}
                                {/* BADGE VI PHẠM (Chỉ hiện nếu > 0) */}
                                {item.violationCount > 0 && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 cursor-help"
                                    title={`Đã vi phạm (bùng kèo) ${item.violationCount} lần`}
                                  >
                                    <ExclamationTriangleIcon className="w-3 h-3 mr-0.5" />
                                    {item.violationCount}
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-gray-500">
                                @{item.username || "user"}
                              </span>
                            </div>
                          </td>

                          {/* Cột Hạng & Điểm */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex w-fit items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 text-xs font-medium capitalize">
                                {item.level || "Chưa hạng"}{" "}
                                {getLevelIcon(item.level)}
                              </span>
                              <span className="text-xs font-bold text-green-600">
                                {item.points?.toLocaleString()} điểm
                              </span>
                            </div>
                          </td>

                          {/* Cột Liên hệ */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col text-xs text-gray-600">
                              <span className="mb-0.5">
                                {item.phone_number || "---"}
                              </span>
                              <span
                                className="text-gray-400 truncate max-w-[140px]"
                                title={item.email}
                              >
                                {item.email}
                              </span>
                            </div>
                          </td>

                          {/* Cột Trạng thái (Logic Observability) */}
                          <td className="py-3 px-4 text-center align-middle">
                            {!item.isActive ? (
                              // 1. HARD BAN
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                                <LockClosedIcon className="w-3 h-3 mr-1" />
                                ĐÃ KHÓA
                              </span>
                            ) : item.isSpamming ? (
                              // 2. SOFT BAN (SPAM)
                              <div className="group relative inline-block">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm cursor-help animate-pulse-slow">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  TẠM KHÓA
                                </span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-800 text-white text-xs rounded-md py-2 px-3 shadow-xl z-50 text-left">
                                  <p className="font-bold text-yellow-400 mb-1">
                                    Đang bị phạt Spam!
                                  </p>
                                  <p>Lý do: Giữ chỗ không trả tiền.</p>
                                  <p className="mt-1 text-gray-300 border-t border-gray-600 pt-1">
                                    Thời gian: {formatDateVN(item.lastSpamTime)}
                                  </p>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                </div>
                              </div>
                            ) : (
                              // 3. ACTIVE
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                                Hoạt động
                              </span>
                            )}
                          </td>

                          {/* Cột Hành động */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`group p-2 rounded-full transition-all duration-200 shadow-sm border ${
                                !item.isActive
                                  ? "bg-white border-green-200 text-green-600 hover:bg-green-50 hover:shadow-md hover:scale-105"
                                  : "bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 hover:shadow-md"
                              }`}
                              title={
                                !item.isActive
                                  ? "Mở khóa tài khoản"
                                  : "Khóa tài khoản (Ban)"
                              }
                            >
                              {!item.isActive ? (
                                <LockOpenIcon className="h-5 w-5" />
                              ) : (
                                <LockClosedIcon className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-sm text-gray-500">
              Trang{" "}
              <span className="font-bold text-gray-900">{pagination.page}</span>{" "}
              / {pagination.totalPages}
              <span className="mx-3 text-gray-300">|</span>
              Tổng{" "}
              <span className="font-bold text-green-600">
                {pagination.totalDocs}
              </span>{" "}
              tài khoản
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  !pagination.hasPrevPage
                    ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center">
                  <ChevronLeftIcon className="h-4 w-4 mr-1" /> Trước
                </div>
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={!pagination.hasNextPage}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  !pagination.hasNextPage
                    ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-green-600 text-white border-transparent hover:bg-green-700 hover:shadow-md shadow-green-200"
                }`}
              >
                <div className="flex items-center">
                  Sau <ChevronRightIcon className="h-4 w-4 ml-1" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManage;
