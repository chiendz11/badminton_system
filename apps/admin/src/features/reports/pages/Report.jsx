import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBookingsForAdmin } from "../../booking/api/booking_service/rest/booking.api.js";
import { getSellHistories } from "../../inventory/api/transaction_service/rest/transaction.api.js";

const centerMapping = [
  {
    name: "Nhà thi đấu quận Thanh Xuân",
    shopId: "67ca6e3cfc964efa218ab7d8",
    bookingId: "CENTER-a63e8f1c-19d2-4e78-90b1-3e4c5a6d7b8f",
  },
  {
    name: "Nhà thi đấu quận Cầu Giấy",
    shopId: "67ca6e3cfc964efa218ab7d9",
    bookingId: "CENTER-b9c2d1f0-5a4b-47e3-982d-1c3f4e5a6b7c",
  },
  {
    name: "Nhà thi đấu quận Tây Hồ",
    shopId: "67ca6e3cfc964efa218ab7d7",
    bookingId: "CENTER-c8f3e2d1-0b9a-41c5-84f9-2d3e4a5b6c7d",
  },
  {
    name: "Nhà thi đấu quận Bắc Từ Liêm",
    shopId: "67ca6e3cfc964efa218ab7da",
    bookingId: "CENTER-d7b1a0e9-3c2d-4f1b-85e0-9a0b1c2d3e4f",
  },
];

export default function DetailedReport() {
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bookings, setBookings] = useState([]);
  const [shopHistories, setShopHistories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUnifiedData = useCallback(async () => {
    setLoading(true);
    const currentCenter = centerMapping[activeIndex];
    try {
      const [bookingRes, shopRes] = await Promise.all([
        getAllBookingsForAdmin({ centerId: currentCenter.bookingId }),
        getSellHistories({ centerId: currentCenter.shopId }),
      ]);
      setBookings(bookingRes.data?.data || bookingRes.data || []);
      setShopHistories(shopRes.data?.data || shopRes.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }, [activeIndex]);

  useEffect(() => {
    fetchUnifiedData();
  }, [fetchUnifiedData]);

  const reportData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      courtRevenue: 0,
      shopRevenue: 0,
      shopProfit: 0,
      totalProfit: 0,
    }));

    bookings.forEach((b) => {
      const date = new Date(b.bookDate || b.date);
      if (date.getFullYear() === selectedYear) {
        const mIdx = date.getMonth();
        months[mIdx].courtRevenue += b.price || 0;
      }
    });

    shopHistories.forEach((s) => {
      const date = new Date(s.createdAt);
      if (date.getFullYear() === selectedYear) {
        const mIdx = date.getMonth();
        months[mIdx].shopRevenue += s.totalAmount || 0;
        months[mIdx].shopProfit += s.totalProfit || 0;
      }
    });

    return months.map((m) => ({
      ...m,
      totalProfit: m.courtRevenue + m.shopProfit,
    }));
  }, [bookings, shopHistories, selectedYear]);

  const yearlyTotals = useMemo(() => {
    return reportData.reduce(
      (acc, curr) => ({
        court: acc.court + curr.courtRevenue,
        shopRev: acc.shopRev + curr.shopRevenue,
        shopProf: acc.shopProf + curr.shopProfit,
        totalProf: acc.totalProf + curr.totalProfit,
      }),
      { court: 0, shopRev: 0, shopProf: 0, totalProf: 0 },
    );
  }, [reportData]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-slate-200 pb-6">
          <div
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer group"
          >
            <h1 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Báo Cáo Tài Chính
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Chi tiết doanh thu năm {selectedYear} •{" "}
              {centerMapping[activeIndex].name}
            </p>
          </div>

          <div className="flex gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            <select
              value={activeIndex}
              onChange={(e) => setActiveIndex(Number(e.target.value))}
              className="bg-transparent border-none font-semibold text-sm outline-none px-3 py-1 cursor-pointer text-slate-700"
            >
              {centerMapping.map((c, index) => (
                <option key={index} value={index}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-200 my-1"></div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none font-semibold text-sm outline-none px-3 py-1 cursor-pointer text-slate-700"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Yearly Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatBox
            title="Lợi nhuận từ Sân"
            value={yearlyTotals.court}
            color="blue"
          />
          <StatBox
            title="Lợi nhuận từ Shop"
            value={yearlyTotals.shopProf}
            color="orange"
          />
          <StatBox
            title="TỔNG LỢI NHUẬN RÒNG"
            value={yearlyTotals.totalProf}
            color="indigo"
            highlight
          />
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-5">Tháng hoạt động</th>
                <th className="p-5 text-center">Doanh thu Sân</th>
                <th className="p-5 text-center">Lợi nhuận Shop</th>
                <th className="p-5 text-right text-indigo-600">
                  Thực thu (Lợi nhuận)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-20 text-center text-slate-400 font-medium animate-pulse"
                  >
                    Đang đồng bộ dữ liệu hệ thống...
                  </td>
                </tr>
              ) : (
                reportData.map((m) => (
                  <tr
                    key={m.month}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="p-5 font-semibold text-slate-700 text-base">
                      Tháng {m.month}
                    </td>
                    <td className="p-5 text-center font-medium text-slate-600">
                      {m.courtRevenue.toLocaleString()}₫
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-sm font-bold text-orange-600 bg-orange-100/50 px-3 py-1 rounded-lg">
                        +{m.shopProfit.toLocaleString()}₫
                      </span>
                    </td>
                    <td className="p-5 text-right font-bold text-lg text-indigo-700">
                      {m.totalProfit.toLocaleString()}₫
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && (
              <tfoot className="bg-slate-800 text-white">
                <tr>
                  <td className="p-6 font-bold text-sm uppercase tracking-wider">
                    Tổng kết cả năm
                  </td>
                  <td className="p-6 text-center font-bold text-lg">
                    {yearlyTotals.court.toLocaleString()}₫
                  </td>
                  <td className="p-6 text-center font-bold text-lg text-orange-300">
                    {yearlyTotals.shopProf.toLocaleString()}₫
                  </td>
                  <td className="p-6 text-right font-bold text-2xl text-emerald-400">
                    {yearlyTotals.totalProf.toLocaleString()}₫
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function StatBox({ title, value, color, highlight }) {
  const themes = {
    blue: "bg-white text-blue-600 border-l-4 border-blue-500 shadow-sm",
    orange: "bg-white text-orange-600 border-l-4 border-orange-500 shadow-sm",
    indigo: "bg-indigo-700 text-white shadow-md shadow-indigo-100",
  };

  return (
    <div className={`p-6 rounded-xl transition-all ${themes[color]}`}>
      <span
        className={`text-xs font-bold uppercase tracking-widest mb-1 block ${highlight ? "text-indigo-100" : "text-slate-500"}`}
      >
        {title}
      </span>
      <span className="text-2xl font-bold tabular-nums">
        {value.toLocaleString()}₫
      </span>
    </div>
  );
}
