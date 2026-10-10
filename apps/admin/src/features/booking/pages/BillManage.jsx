import React, { useEffect, useState, useCallback, useContext } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ClockIcon,
  CalendarDaysIcon, // 🟢 Icon dành riêng cho đơn tháng
} from "@heroicons/react/24/outline";

// 👇 IMPORT API
import { getAllBookingsForAdmin } from "../api/booking_service/rest/booking.api.js";
import { getAllCentersGQL } from "../../centers/api/center_service/graphql/center.api.js";

// 👇 IMPORT CONTEXT & ROLES
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { ROLES } from "../../../shared/constants/roles.js";

const AdminBillList = () => {
  const navigate = useNavigate();
  const { admin } = useContext(SessionContext);

  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [centers, setCenters] = useState([]);

  // Filter States
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCenterId, setSelectedCenterId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState("");

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const isSuperAdmin = admin?.role === ROLES.SUPER_ADMIN;

  // 1. Fetch danh sách Center
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centerList = await getAllCentersGQL();
        setCenters(centerList || []);

        if (admin?.role === ROLES.CENTER_MANAGER) {
          if (admin.centerId) {
            setSelectedCenterId(admin.centerId);
          } else {
            const myCenter = centerList.find(
              (c) => c.centerManagerId === admin.userId,
            );
            if (myCenter) setSelectedCenterId(myCenter.centerId);
          }
        }
      } catch (error) {
        console.error("Lỗi lấy center:", error);
      }
    };
    if (admin) fetchCenters();
  }, [admin]);

  // 2. Fetch Bookings (Logic Lọc)
  const fetchBillsData = useCallback(async () => {
    if (admin?.role === ROLES.CENTER_MANAGER && !selectedCenterId) return;

    setLoading(true);
    try {
      // 🟢 Mapping Tab -> Query Param
      let typeParam = "";
      if (activeTab === "daily") typeParam = "daily";
      if (activeTab === "fixed") typeParam = "monthly";

      const params = {
        page,
        limit,
        type: typeParam,
        status: selectedStatus,
        centerId: selectedCenterId,
        date: selectedDate ? selectedDate.toISOString() : "",
      };

      const response = await getAllBookingsForAdmin(params);
      setBills(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Lỗi fetch bills:", error);
      toast.error("Không thể tải danh sách đơn hàng");
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [
    admin?.role,
    selectedCenterId,
    activeTab,
    page,
    limit,
    selectedStatus,
    selectedDate,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBillsData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchBillsData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedStatus, selectedCenterId, selectedDate]);

  // --- HANDLERS ---
  const handleResetFilters = () => {
    setActiveTab("all");
    setSelectedStatus("");
    setSelectedDate(new Date());
    setPage(1);
    if (isSuperAdmin) setSelectedCenterId("");
    toast.success("Đã đặt lại bộ lọc mặc định");
  };

  const toggleAllTime = () => {
    if (selectedDate === null) setSelectedDate(new Date());
    else setSelectedDate(null);
  };

  const handleBack = () => navigate(-1);
  const handleBillClick = (bill) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };

  const getCenterName = (centerId) => {
    const center = centers.find((c) => c.centerId === centerId);
    return center ? center.name : centerId || "N/A";
  };

  const getStatusText = (status) => {
    const map = {
      confirmed: "Đã xác nhận",
      cancelled: "Đã hủy",
    };
    return map[status] || status || "N/A";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full font-inter">
      <div className="bg-white w-full shadow-md overflow-hidden pb-4">
        {/* HEADER: Gọn gàng, không nút thừa */}
        <div className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="hover:bg-emerald-600 rounded-full p-2 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold leading-none">
                Quản lý Đơn đặt sân
              </h1>
              <p className="text-emerald-100 text-sm mt-1 opacity-90">
                {isSuperAdmin
                  ? "Toàn bộ hệ thống"
                  : getCenterName(selectedCenterId)}
              </p>
            </div>
          </div>
        </div>

        {/* --- FILTERS CONTAINER --- */}
        <div className="p-4 space-y-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 1. Center Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                Trung tâm
              </label>
              <div className="relative">
                <select
                  value={selectedCenterId}
                  onChange={(e) =>
                    isSuperAdmin && setSelectedCenterId(e.target.value)
                  }
                  disabled={!isSuperAdmin}
                  className={`w-full border rounded-lg p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow appearance-none
                                ${!isSuperAdmin ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200" : "bg-white border-gray-300 cursor-pointer shadow-sm"}
                            `}
                >
                  {isSuperAdmin && <option value="">Tất cả trung tâm</option>}
                  {centers.map((center) => (
                    <option key={center.centerId} value={center.centerId}>
                      {center.name}
                    </option>
                  ))}
                </select>
                <BuildingOfficeIcon
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${!isSuperAdmin ? "text-gray-400" : "text-emerald-500"}`}
                />
              </div>
            </div>

            {/* 2. Date Filter */}
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                Thời gian
              </label>
              <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-300">
                <div
                  className={`relative flex-1 transition-colors ${selectedDate === null ? "bg-gray-100" : "bg-white"}`}
                >
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày..."
                    disabled={selectedDate === null}
                    className={`w-full p-2.5 pl-10 text-sm outline-none bg-transparent cursor-pointer
                                    ${selectedDate === null ? "text-gray-400" : "text-gray-800"}
                                `}
                  />
                  <CalendarIcon
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${selectedDate === null ? "text-gray-400" : "text-emerald-500"}`}
                  />
                </div>

                <button
                  onClick={toggleAllTime}
                  className={`px-3 text-xs font-medium border-l border-gray-300 transition-colors whitespace-nowrap flex items-center gap-1
                                ${
                                  selectedDate === null
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                }
                            `}
                  title="Xem toàn bộ lịch sử"
                >
                  {selectedDate === null ? (
                    <>
                      <ClockIcon className="h-4 w-4" /> Toàn bộ
                    </>
                  ) : (
                    "Xem tất cả"
                  )}
                </button>
              </div>
            </div>

            {/* 3. Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                Trạng thái
              </label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm bg-white"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
              </div>
            </div>

            {/* 4. Reset Button */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="h-[42px] px-4 rounded-lg border border-gray-300 bg-white text-gray-600 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm font-medium text-sm"
                title="Về mặc định"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span className="hidden xl:inline">Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* TABS (Loại đơn - Visual Filter) */}
        <div className="flex justify-center bg-white border-b shadow-sm">
          {/* Daily Tab */}
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "daily"
                ? "text-emerald-700 border-emerald-600 bg-emerald-50/50"
                : "text-gray-500 border-transparent hover:text-emerald-600 hover:bg-gray-50"
            }`}
          >
            <CalendarIcon className="h-4 w-4" /> Đơn ngày
          </button>

          {/* Fixed Tab */}
          <button
            onClick={() => setActiveTab("fixed")}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "fixed"
                ? "text-blue-700 border-blue-600 bg-blue-50/50" // 🟢 Màu xanh dương riêng biệt
                : "text-gray-500 border-transparent hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4" /> Đơn cố định
          </button>

          {/* All Tab */}
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "all"
                ? "text-gray-800 border-gray-800 bg-gray-50"
                : "text-gray-500 border-transparent hover:text-gray-800"
            }`}
          >
            Tất cả
          </button>
        </div>

        {/* LIST - VISUALIZATION CORE */}
        <div className="bg-white min-h-[300px]">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-60 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <FunnelIcon className="h-8 w-8 text-gray-300" />
              </div>
              <span className="italic">
                Không tìm thấy đơn hàng nào phù hợp
              </span>
            </div>
          ) : (
            bills.map((bill) => {
              const billId = bill._id || "N/A";
              const centerName = getCenterName(bill.centerId);

              // 🟢 Logic phân loại màu sắc: MONTHLY (Blue) vs DAILY (Emerald)
              const isMonthly = bill.bookingType === "monthly";
              const themeColor = isMonthly ? "blue" : "emerald";
              const themeBg = isMonthly ? "bg-blue-50" : "bg-emerald-50";
              const themeText = isMonthly
                ? "text-blue-600"
                : "text-emerald-600";
              const themeBorder = isMonthly
                ? "border-blue-200"
                : "border-emerald-200";
              const themeBadgeBg = isMonthly ? "bg-blue-100" : "bg-emerald-100";
              const themeBadgeText = isMonthly
                ? "text-blue-800"
                : "text-emerald-800";

              return (
                <div
                  key={billId}
                  className={`border-b p-4 cursor-pointer hover:bg-opacity-70 transition-colors flex items-start gap-4 group ${isMonthly ? "hover:bg-blue-50" : "hover:bg-emerald-50"}`}
                  onClick={() => handleBillClick(bill)}
                >
                  {/* 🟢 Icon loại đơn (Visual Cue) */}
                  <div
                    className={`mt-1 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${themeBg} ${themeText} ${themeBorder}`}
                  >
                    {isMonthly ? (
                      <CalendarDaysIcon className="h-6 w-6" />
                    ) : (
                      <CalendarIcon className="h-6 w-6" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`font-bold text-lg group-hover:underline ${isMonthly ? "text-blue-900" : "text-gray-800"}`}
                      >
                        {bill.userName || "Khách vãng lai"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(bill.bookDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    {/* Badge loại đơn rõ ràng hơn */}
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${themeBadgeBg} ${themeBadgeText} ${themeBorder}`}
                      >
                        {isMonthly ? "Cố định" : "Lẻ"}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="font-medium text-gray-700 flex items-center gap-1">
                        <BuildingOfficeIcon className="h-3 w-3 text-gray-400" />
                        {centerName}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(bill.bookingStatus)} border-opacity-20`}
                      >
                        {getStatusText(bill.bookingStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center h-full">
                    <div
                      className={`font-bold text-lg ${isMonthly ? "text-blue-700" : "text-emerald-700"}`}
                    >
                      {(bill.price || 0).toLocaleString()} đ
                    </div>
                    {isMonthly && (
                      <span className="text-[10px] text-blue-400 mt-1 italic font-medium">
                        Auto-confirm
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-4 px-4 pb-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className={`p-2 rounded-full border transition-colors ${
                page === 1
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-emerald-600 border-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Trang <span className="font-bold text-emerald-700">{page}</span> /{" "}
              {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className={`p-2 rounded-full border transition-colors ${
                page === totalPages
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-emerald-600 border-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* --- MODAL CHI TIẾT (Logic hiển thị đồng bộ) --- */}
      {isModalOpen && selectedBill && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <Dialog.Panel className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <Dialog.Title className="text-xl font-bold text-gray-800">
                  Chi tiết Booking
                </Dialog.Title>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="col-span-2 font-medium text-gray-900 text-lg">
                    {selectedBill.userName}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Trung tâm:</span>
                  <span className="col-span-2 font-medium text-gray-900">
                    {getCenterName(selectedBill.centerId)}
                  </span>
                </div>

                {/* 🟢 Visual Badge trong Modal */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-gray-500">Loại đơn:</span>
                  <span className="col-span-2 font-medium">
                    {selectedBill.bookingType === "monthly" ? (
                      <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded w-fit">
                        <CalendarDaysIcon className="h-4 w-4" /> Cố định theo
                        tháng
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded w-fit">
                        <CalendarIcon className="h-4 w-4" /> Đặt theo ngày
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className="col-span-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold ${getStatusBadgeClass(selectedBill.bookingStatus)}`}
                    >
                      {getStatusText(selectedBill.bookingStatus)}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Ngày chơi:</span>
                  <span className="col-span-2 font-medium">
                    {selectedBill.bookDate
                      ? new Date(selectedBill.bookDate).toLocaleDateString(
                          "vi-VN",
                        )
                      : "N/A"}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-2">
                  <span className="text-gray-500 block mb-2 font-medium">
                    Lịch đặt sân:
                  </span>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                    {selectedBill.courtBookingDetails?.map((detail, idx) => (
                      <div
                        key={idx}
                        className="text-gray-700 flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm"
                      >
                        <span className="font-medium text-emerald-700">
                          Sân {detail.courtId}
                        </span>
                        <div className="flex gap-2">
                          {detail.timeslots.map((slot) => (
                            <span
                              key={slot}
                              className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs border"
                            >
                              {slot}:00 - {slot + 1}:00
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(!selectedBill.courtBookingDetails ||
                      selectedBill.courtBookingDetails.length === 0) && (
                      <span className="text-gray-400 italic text-xs">
                        Không có thông tin chi tiết
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4 mt-2">
                  <span className="text-gray-600 font-bold text-base">
                    Tổng giá đặt sân:
                  </span>
                  <span
                    className={`font-bold text-2xl ${selectedBill.bookingType === "monthly" ? "text-blue-600" : "text-emerald-600"}`}
                  >
                    {(selectedBill.price || 0).toLocaleString()}{" "}
                    <span className="text-sm">VNĐ</span>
                  </span>
                </div>

                {selectedBill.note && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 mt-2">
                    <span className="text-yellow-700 font-semibold text-xs uppercase block mb-1">
                      Ghi chú
                    </span>
                    <span className="italic text-gray-700">
                      {selectedBill.note}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default AdminBillList;
