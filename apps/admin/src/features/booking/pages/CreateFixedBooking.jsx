import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// 👇 API
import {
  getAvailableCourts,
  createFixedBookings,
} from "../api/booking_service/rest/booking.api.js";
import { bookingCustomers } from "../../../shared/session/booking-directory.js";
import { getAllCentersGQL } from "../../centers/api/center_service/graphql/center.api.js";

// Icons & UI
import {
  ArrowLeftIcon,
  CalendarIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon, // Thêm Icon tiền
} from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CreateFixedBooking = () => {
  const navigate = useNavigate();

  // ... (Giữ nguyên các State cũ) ...
  const [centers, setCenters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [selectedCenter, setSelectedCenter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimeslots, setSelectedTimeslots] = useState([]);

  const [availableCourtsByDay, setAvailableCourtsByDay] = useState({});
  const [selectedCourtsByDay, setSelectedCourtsByDay] = useState({});

  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [loading, setLoading] = useState(false);

  // Thêm state tổng tiền dự kiến
  const [previewTotal, setPreviewTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingsToCreate, setBookingsToCreate] = useState([]);
  const [resultModal, setResultModal] = useState({
    open: false,
    success: true,
    message: "",
  });

  const dropdownRef = useRef(null);
  const fixedRequestKey = useRef(null);

  // --- CONSTANTS ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 30);

  const availableTimeslots = Array.from(
    { length: 19 },
    (_, i) => `${i + 5}:00`,
  );

  const daysOfWeek = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 0, label: "Chủ nhật" },
  ];

  // ... (Giữ nguyên phần useEffect Fetch Data và Search User) ...
  useEffect(() => {
    const initData = async () => {
      setLoadingCenters(true);
      try {
        const [centersData, usersRes] = await Promise.all([
          getAllCentersGQL(),
          Promise.resolve({ data: bookingCustomers() }),
        ]);
        setCenters(centersData || []);
        setAllUsers(usersRes.data || []);
      } catch (error) {
        console.error("Init Error:", error);
        setResultModal({
          open: true,
          success: false,
          message: "Lỗi tải dữ liệu!",
        });
      } finally {
        setLoadingCenters(false);
      }
    };
    initData();
  }, []);

  // ... (Giữ nguyên logic Search User và check available courts) ...
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    if (
      selectedUser &&
      (selectedUser.name === searchQuery ||
        selectedUser.username === searchQuery)
    )
      return [];
    const lower = searchQuery.toLowerCase();
    return allUsers
      .filter((u) => {
        const name = (u.name || u.username || "").toLowerCase();
        const phone = (u.phone_number || "").toLowerCase();
        return name.includes(lower) || phone.includes(lower);
      })
      .slice(0, 10);
  }, [searchQuery, allUsers, selectedUser]);

  useEffect(() => {
    if (searchQuery && filteredUsers.length > 0) setShowDropdown(true);
    else setShowDropdown(false);
  }, [filteredUsers, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setAvailableCourtsByDay({});
    setSelectedCourtsByDay({});
    if (!selectedCenter || !selectedDays.length || !selectedTimeslots.length)
      return;

    const timer = setTimeout(async () => {
      setLoadingCourts(true);
      try {
        const normalizedDate = new Date(startDate);
        normalizedDate.setHours(0, 0, 0, 0);
        const res = await getAvailableCourts({
          centerId: selectedCenter,
          startDate: normalizedDate,
          timeslots: selectedTimeslots,
          daysOfWeek: selectedDays,
        });
        setAvailableCourtsByDay(res);
        const resetSelection = {};
        selectedDays.forEach((day) => (resetSelection[day] = []));
        setSelectedCourtsByDay(resetSelection);
      } catch (error) {
        console.error("Check Courts Error:", error);
      } finally {
        setLoadingCourts(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedCenter, selectedDays, selectedTimeslots, startDate]);

  // ... (Handlers đơn giản giữ nguyên) ...
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name || user.username);
    setShowDropdown(false);
  };

  const toggleSelection = (list, item, setList) => {
    setList((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item].sort(),
    );
  };

  const handleDayChange = (day) => {
    toggleSelection(selectedDays, day, setSelectedDays);
    if (selectedDays.includes(day)) {
      setSelectedCourtsByDay((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
    }
  };

  const handleCourtSelect = (day, courtId) => {
    setSelectedCourtsByDay((prev) => {
      const current = prev[day] || [];
      const updated = current.includes(courtId)
        ? current.filter((c) => c !== courtId)
        : [...current, courtId];
      return { ...prev, [day]: updated };
    });
  };

  // =========================================================================
  // 🟢 1. HÀM TÍNH GIÁ (Logic mới)
  // =========================================================================
  const calculateSlotPrice = (centerPricing, date, hour) => {
    if (!centerPricing) return 0;

    // 0 = CN, 6 = T7 -> Weekend
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Lấy config tương ứng
    const timeConfigs = isWeekend
      ? centerPricing.weekend
      : centerPricing.weekday;
    if (!timeConfigs || timeConfigs.length === 0) return 0;

    // Tìm khung giờ phù hợp
    const matchedConfig = timeConfigs.find((config) => {
      // Chuyển string "05:00" -> 5
      const start = parseInt(config.startTime.split(":")[0]);
      const end = parseInt(config.endTime.split(":")[0]);
      return hour >= start && hour < end;
    });

    return matchedConfig ? matchedConfig.price : 0;
  };

  // =========================================================================
  // 🟢 2. CẬP NHẬT HANDLE PREVIEW
  // =========================================================================
  const handlePreview = () => {
    if (!selectedUser) return alert("Chưa chọn khách hàng!");
    if (!selectedCenter) return alert("Chưa chọn trung tâm!");
    if (!selectedDays.length || !selectedTimeslots.length)
      return alert("Chưa chọn ngày/giờ!");

    const missingCourts = selectedDays.some(
      (day) => !selectedCourtsByDay[day]?.length,
    );
    if (missingCourts)
      return alert("Vui lòng chọn ít nhất 1 sân cho mỗi thứ đã chọn!");

    // Lấy thông tin Pricing của Center đang chọn
    const currentCenterObj = centers.find((c) => c.centerId === selectedCenter);
    const pricing = currentCenterObj?.pricing;

    const bookings = [];
    let totalEstimated = 0; // Biến cộng dồn tổng tiền

    let current = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const slotsInt = selectedTimeslots
      .map((t) => parseInt(t.split(":")[0]))
      .sort((a, b) => a - b);

    while (current <= end) {
      const dayIdx = current.getDay();

      if (selectedDays.includes(dayIdx)) {
        // Lọc giờ tương lai
        const validSlotsForDate = slotsInt.filter((slot) => {
          const slotTime = new Date(current);
          slotTime.setHours(slot, 0, 0, 0);
          return slotTime > now;
        });

        if (validSlotsForDate.length > 0) {
          const courts = selectedCourtsByDay[dayIdx] || [];
          const available = availableCourtsByDay[dayIdx] || [];

          courts.forEach((cId) => {
            const cInfo = available.find(
              (c) => c.courtId === cId || c._id === cId,
            );

            // Tính tiền cho dòng booking này
            let lineTotal = 0;
            validSlotsForDate.forEach((h) => {
              lineTotal += calculateSlotPrice(pricing, current, h);
            });

            bookings.push({
              date: new Date(current).toISOString(),
              courtId: cId,
              courtName: cInfo?.name || cId,
              timeslots: validSlotsForDate,
              price: lineTotal, // Lưu giá vào item để hiển thị
            });

            totalEstimated += lineTotal;
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    if (bookings.length === 0) {
      setResultModal({
        open: true,
        success: false,
        message:
          "Không có lịch nào được tạo vì tất cả các khung giờ bạn chọn đều ở trong quá khứ.",
      });
      return;
    }

    fixedRequestKey.current = null;
    setPreviewTotal(totalEstimated); // Set state tổng tiền
    setBookingsToCreate(bookings);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setIsModalOpen(false);
    try {
      // Xóa trường `price` client-side trước khi gửi lên server (nếu API không cần)
      // Hoặc cứ để đó nếu server ignore fields lạ.
      const cleanBookings = bookingsToCreate.map(({ price, ...rest }) => rest);

      const res = await createFixedBookings(
        {
          userId: selectedUser.userId || selectedUser._id,
          userName: selectedUser.name || selectedUser.username,
          centerId: selectedCenter,
          bookings: cleanBookings,
        },
        (fixedRequestKey.current ||= crypto.randomUUID()),
      );
      fixedRequestKey.current = null;

      // Nếu server trả về tổng tiền thực tế, dùng nó, nếu không dùng số client tính
      const finalTotal = Array.isArray(res)
        ? res.reduce((sum, b) => sum + (b.price || 0), 0)
        : previewTotal;

      setResultModal({
        open: true,
        success: true,
        message: `Tạo thành công ${bookingsToCreate.length} lịch đặt. Tổng tiền: ${finalTotal.toLocaleString()} đ`,
      });
    } catch (error) {
      setResultModal({
        open: true,
        success: false,
        message: error.message || "Lỗi khi tạo đơn hàng!",
      });
    } finally {
      setLoading(false);
    }
  };

  // ... (Giữ nguyên phần render INPUT SECTION) ...

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      {/* ... Header & Input Fields (Giữ nguyên code cũ) ... */}

      {/* Chỉ paste lại phần UI cần sửa đổi hoặc giữ nguyên nếu bạn đã có */}
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-20 shadow-md flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/20 rounded-full mr-4"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Tạo Lịch Đặt Cố Định (Tháng)
        </h1>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
          {/* ... Phần User Search, Center Select, Date Picker, Summary Box,
                        Selection Area (Time, Days, Court Grid) ...
                        (Code này giống hệt bài trước của bạn, không cần sửa)
                     */}

          {/* COPY LẠI PHẦN RENDER TỪ BÀI TRƯỚC VÀO ĐÂY */}
          {/* ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Search */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Khách hàng
              </label>
              <div className="relative">
                <input
                  className="w-full border rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Tìm tên, SĐT, Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                {selectedUser && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery("");
                    }}
                    className="absolute right-2 top-2.5 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded-lg shadow-xl max-h-60 overflow-auto z-30">
                  {filteredUsers.length ? (
                    filteredUsers.map((u) => (
                      <div
                        key={u._id || u.userId}
                        onClick={() => handleSelectUser(u)}
                        className="p-3 hover:bg-emerald-50 cursor-pointer border-b flex justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm text-gray-800">
                            {u.name || u.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.phone_number} - {u.email}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Không tìm thấy kết quả
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Center Select */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Trung tâm
              </label>
              <div className="relative">
                <select
                  className="w-full border rounded-lg p-2.5 pl-10 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                  disabled={loadingCenters}
                >
                  <option value="">-- Chọn trung tâm --</option>
                  {centers.map((c) => (
                    <option key={c.centerId} value={c.centerId}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <BuildingOffice2Icon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Ngày bắt đầu
              </label>
              <div className="relative">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    setStartDate(d);
                  }}
                  dateFormat="dd/MM/yyyy"
                  minDate={today}
                  className="w-full border rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                />
                <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Time Selection & Days & Court Grid (Giữ nguyên) */}
          {/* ... (Copy từ code cũ của bạn) ... */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                1. Chọn khung giờ (Cố định)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTimeslots.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      toggleSelection(
                        selectedTimeslots,
                        t,
                        setSelectedTimeslots,
                      )
                    }
                    className={`px-3 py-1.5 rounded text-sm border transition-all ${selectedTimeslots.includes(t) ? "bg-emerald-600 text-white border-emerald-600 shadow" : "hover:border-emerald-500 bg-white"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                2. Chọn thứ trong tuần
              </label>
              <div className="flex flex-wrap gap-3">
                {daysOfWeek.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => handleDayChange(d.value)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm border transition-all ${selectedDays.includes(d.value) ? "bg-blue-600 text-white border-blue-600 shadow" : "hover:bg-gray-50 bg-white"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedDays.length > 0 && selectedTimeslots.length > 0 && (
              <div className="border-t pt-6 animate-fade-in">
                <label className="text-sm font-bold text-gray-700 mb-4 block">
                  3. Chọn sân cho từng thứ
                </label>
                {loadingCourts ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500 italic">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                    Đang kiểm tra tình trạng sân...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daysOfWeek
                      .filter((d) => selectedDays.includes(d.value))
                      .map((d) => {
                        const courts = availableCourtsByDay[d.value] || [];
                        const selected = selectedCourtsByDay[d.value] || [];

                        return (
                          <div
                            key={d.value}
                            className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between mb-3 border-b pb-2">
                              <span className="font-bold text-gray-800">
                                {d.label}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${courts.length ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                              >
                                {courts.length} Sân Trống
                              </span>
                            </div>

                            {courts.length === 0 ? (
                              <div className="text-xs text-red-400 italic text-center">
                                Hết sân khung giờ này!
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {courts.map((c) => (
                                  <button
                                    key={c.courtId || c._id}
                                    onClick={() =>
                                      handleCourtSelect(
                                        d.value,
                                        c.courtId || c._id,
                                      )
                                    }
                                    className={`text-xs p-2 rounded border truncate transition-all ${selected.includes(c.courtId || c._id) ? "bg-emerald-500 text-white border-emerald-500 shadow-inner" : "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300"}`}
                                    title={c.name}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action */}
          <button
            onClick={handlePreview}
            disabled={loading || loadingCourts}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.005] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Xác nhận & Xem giá"}
          </button>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 🟢 3. MODAL CONFIRM - HIỂN THỊ GIÁ TIỀN */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 animate-scaleIn">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarDaysIcon className="h-6 w-6 text-emerald-600" />
                Xác nhận đơn hàng
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="hover:bg-gray-100 rounded-full p-1"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100 grid grid-cols-2 gap-2">
                <div className="col-span-2 md:col-span-1">
                  Khách hàng:{" "}
                  <span className="font-bold text-gray-900">
                    {selectedUser?.name || selectedUser?.username}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  Số lượng:{" "}
                  <span className="font-bold text-blue-700">
                    {bookingsToCreate.length} slots
                  </span>
                </div>

                <div className="col-span-2 border-t border-blue-200 mt-2 pt-2 flex justify-between items-center">
                  <span className="text-gray-700 font-bold">
                    TỔNG TIỀN DỰ KIẾN:
                  </span>
                  <span className="text-xl font-bold text-red-600 flex items-center gap-1">
                    <CurrencyDollarIcon className="w-6 h-6" />
                    {previewTotal.toLocaleString()} đ
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {bookingsToCreate.map((b, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm bg-white p-3 rounded border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-bold text-gray-800">
                          {new Date(b.date).toLocaleDateString("vi-VN", {
                            weekday: "long",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          Sân: {b.courtName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-1 justify-end mb-1">
                        {b.timeslots.map((t) => (
                          <span
                            key={t}
                            className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200"
                          >
                            {t}:00
                          </span>
                        ))}
                      </div>
                      {/* Hiển thị giá từng dòng */}
                      <div className="text-xs font-bold text-gray-700">
                        {b.price ? `${b.price.toLocaleString()} đ` : "0 đ"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition-colors"
              >
                Đồng ý tạo ({previewTotal.toLocaleString()} đ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Result (Giữ nguyên) */}
      {resultModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 text-center transform transition-all scale-100">
            <div className="flex justify-center mb-6">
              {resultModal.success ? (
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                </div>
              ) : (
                <div className="bg-red-100 p-4 rounded-full">
                  <ExclamationCircleIcon className="w-16 h-16 text-red-500" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-800">
              {resultModal.success ? "Thành công!" : "Thất bại"}
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {resultModal.message}
            </p>
            <button
              onClick={() => {
                setResultModal({ ...resultModal, open: false });
                if (resultModal.success) navigate("/dashboard");
              }}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${resultModal.success ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-500 hover:bg-gray-600"}`}
            >
              {resultModal.success ? "Về danh sách đơn" : "Đóng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateFixedBooking;
