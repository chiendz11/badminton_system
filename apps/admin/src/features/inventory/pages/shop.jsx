import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSellHistories } from "../api/transaction_service/rest/transaction.api.js";
import { getInventoryList } from "../api/inventory_service/rest/inventory.api.js";

export default function Shop() {
  const navigate = useNavigate();

  // 1. Cấu hình danh sách trung tâm
  const centers = [
    { id: "67ca6e3cfc964efa218ab7d8", name: "Nhà thi đấu quận Thanh Xuân" },
    { id: "67ca6e3cfc964efa218ab7d9", name: "Nhà thi đấu quận Cầu Giấy" },
    { id: "67ca6e3cfc964efa218ab7d7", name: "Nhà thi đấu quận Tây Hồ" },
    { id: "67ca6e3cfc964efa218ab7da", name: "Nhà thi đấu quận Bắc Từ Liêm" },
  ];

  // 2. States quản lý danh sách và bộ lọc
  const [sellHistories, setSellHistories] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [loading, setLoading] = useState(false);

  // States quản lý Modal & Giỏ hàng

  // 3. Hàm lấy dữ liệu lịch sử bán hàng
  const fetchHistories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSellHistories({
        centerId: selectedCenter,
        invoiceNumber: searchInvoice,
      });
      setSellHistories(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCenter, searchInvoice]);

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  // 4. Tính tổng doanh thu kỳ lọc
  const totalAmount = useMemo(() => {
    return sellHistories.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  }, [sellHistories]);

  // 5. Mở Modal & Lấy kho

  // 6. Xử lý gửi dữ liệu thanh toán

  // 7. Tính tổng tiền tạm tính trong Modal

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* NÚT QUAY LẠI DASHBOARD */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <span className="text-lg">←</span> QUAY LẠI DASHBOARD
        </button>
        {/* HEADER - Đã giảm cỡ chữ tiêu đề và nút */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
              Quản Lý Bán Hàng
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">
              Lịch sử giao dịch xuất kho
            </p>
          </div>
        </div>

        {/* BỘ LỌC */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Chọn trung tâm
            </label>
            <select
              className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer text-sm"
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
            >
              <option value="">-- Tất cả trung tâm --</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Tra cứu hóa đơn
            </label>
            <input
              type="text"
              placeholder="Nhập mã INV-..."
              className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
            />
          </div>
        </div>

        {/* BẢNG LỊCH SỬ - Đã giảm cỡ chữ số tiền */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Hóa đơn
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sản phẩm xuất
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  PTTT
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-20 text-center font-bold text-slate-300 animate-pulse"
                  >
                    ĐANG TẢI...
                  </td>
                </tr>
              ) : sellHistories.length > 0 ? (
                sellHistories.map((h) => (
                  <tr
                    key={h._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-6">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[11px]">
                        {h.invoiceNumber}
                      </span>
                    </td>
                    <td className="p-6">
                      {h.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-sm font-bold text-slate-600 mb-1"
                        >
                          • {item.inventoryId?.name || "N/A"}{" "}
                          <span className="text-slate-300">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="p-6 text-center">
                      <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 rounded-md text-slate-500 uppercase">
                        {h.paymentMethod}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-lg font-black text-slate-800 tracking-tight italic">
                        {h.totalAmount?.toLocaleString()}₫
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="p-20 text-center text-slate-300 font-bold uppercase italic tracking-widest"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
            {/* TFOOT - Đã đổi sang màu nhạt (Slate-100) */}
            <tfoot className="bg-slate-100 border-t border-slate-200">
              <tr>
                <td
                  colSpan="3"
                  className="p-8 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]"
                >
                  Tổng doanh thu chọn lọc:
                </td>
                <td className="p-8 text-right font-black text-indigo-600 text-2xl tracking-tighter italic">
                  {totalAmount.toLocaleString()}₫
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL CHECKOUT - Đã giảm cỡ chữ số tiền tạm tính */}
    </div>
  );
}
