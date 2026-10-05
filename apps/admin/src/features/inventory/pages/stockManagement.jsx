import React, { useCallback, useEffect, useState } from "react";
import {
  importStock,
  importNewStock,
  getStockHistory,
  getInventoryList,
} from "../api/inventory_service/rest/inventory.api.js";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const centers = [
  { id: "67ca6e3cfc964efa218ab7d8", name: "Nhà thi đấu quận Thanh Xuân" },
  { id: "67ca6e3cfc964efa218ab7d9", name: "Nhà thi đấu quận Cầu Giấy" },
  { id: "67ca6e3cfc964efa218ab7d7", name: "Nhà thi đấu quận Tây Hồ" },
  { id: "67ca6e3cfc964efa218ab7da", name: "Nhà thi đấu quận Bắc Từ Liêm" },
];

const IMPORT_UNITS = ["Thùng", "Két", "Hộp", "Lố", "Bao", "Gói"];

export default function StockManagement() {
  const navigate = useNavigate(); // Khởi tạo điều hướng

  // --- STATE BỘ LỌC ---
  const [selectedCenter, setSelectedCenter] = useState(centers[0].id);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("all");

  // --- STATE DỮ LIỆU ---
  const [inventoryList, setInventoryList] = useState([]);
  const [importHistory, setImportHistory] = useState([]);

  // --- STATE FORM ---
  const [activeTab, setActiveTab] = useState("EXISTING");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const [stockForm, setStockForm] = useState({
    supplier: "",
    quantityImport: 1,
    unitImport: "Thùng",
    unitImportQuantity: 24,
    importPrice: 0,
  });

  const [newProductForm, setNewProductForm] = useState({
    name: "",
    category: "Đồ uống",
    unitSell: "Cái",
    price: 0,
  });

  // --- 1. FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      const [invRes, histRes] = await Promise.all([
        getInventoryList(selectedCenter),
        getStockHistory({
          centerId: selectedCenter,
          year: selectedYear,
          month: selectedMonth === "all" ? undefined : selectedMonth,
        }),
      ]);

      setInventoryList(invRes.data?.data || []);
      setImportHistory(Array.isArray(histRes.data) ? histRes.data : []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
  }, [selectedCenter, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 2. HANDLERS ---
  const handleStockChange = (e) => {
    setStockForm({ ...stockForm, [e.target.name]: e.target.value });
  };

  const handleNewProductChange = (e) => {
    setNewProductForm({ ...newProductForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const qtyImport = Number(stockForm.quantityImport);
    const unitQty = Number(stockForm.unitImportQuantity);
    const impPrice = Number(stockForm.importPrice);
    const totalAdded = qtyImport * unitQty;
    const totalCost = qtyImport * impPrice;

    const stockInfoPayload = {
      centerId: selectedCenter,
      supplier: stockForm.supplier,
      quantityImport: qtyImport,
      unitImport: stockForm.unitImport,
      unitImportQuantity: unitQty,
      importPrice: impPrice,
      totalAdded: totalAdded,
      totalCost: totalCost,
    };

    try {
      if (activeTab === "EXISTING") {
        if (!selectedInventoryId) return alert("Vui lòng chọn mặt hàng!");
        await importStock({
          ...stockInfoPayload,
          inventoryId: selectedInventoryId,
        });
      } else {
        if (!newProductForm.name) return alert("Vui lòng nhập tên hàng mới!");
        const fullPayload = {
          productInfo: {
            ...newProductForm,
            price: Number(newProductForm.price),
          },
          stockInfo: stockInfoPayload,
        };
        await importNewStock(fullPayload);
      }

      alert("Nhập kho thành công!");
      setStockForm({
        ...stockForm,
        quantityImport: 1,
        importPrice: 0,
        supplier: "",
      });
      setNewProductForm({
        name: "",
        category: "Đồ uống",
        unitSell: "Cái",
        price: 0,
      });
      setSelectedInventoryId("");
      fetchData();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message;
      alert("Lỗi nhập kho: " + msg);
    }
  };

  const previewTotal =
    Number(stockForm.quantityImport) * Number(stockForm.unitImportQuantity);
  const previewCost =
    Number(stockForm.quantityImport) * Number(stockForm.importPrice);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* NÚT QUAY LẠI DASHBOARD */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-2 flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <span className="text-lg">←</span> QUAY LẠI DASHBOARD
      </button>

      <h1 className="text-3xl font-bold text-center text-blue-800 uppercase">
        Quản lý Nhập Kho
      </h1>

      {/* --- PHẦN 1: BỘ LỌC --- */}
      <div className="bg-white p-4 rounded shadow border flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-1">Trung tâm:</label>
          <select
            className="w-full border rounded px-3 py-2 bg-blue-50"
            value={selectedCenter}
            onChange={(e) => setSelectedCenter(e.target.value)}
          >
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold mb-1">Năm:</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold mb-1">Tháng:</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- PHẦN 2: FORM NHẬP (BÊN TRÁI) --- */}
        <div className="lg:col-span-1 bg-white rounded shadow border border-gray-200 overflow-hidden h-fit sticky top-4">
          <div className="flex border-b">
            <button
              className={`flex-1 py-3 font-bold text-sm uppercase ${activeTab === "EXISTING" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              onClick={() => setActiveTab("EXISTING")}
            >
              Hàng có sẵn
            </button>
            <button
              className={`flex-1 py-3 font-bold text-sm uppercase ${activeTab === "NEW" ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              onClick={() => setActiveTab("NEW")}
            >
              Hàng mới tinh
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {activeTab === "EXISTING" ? (
              <div className="space-y-2">
                <label className="font-semibold text-gray-700">
                  Chọn sản phẩm:
                </label>
                <select
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  required={activeTab === "EXISTING"}
                >
                  <option value="">-- Tìm kiếm --</option>
                  {inventoryList.map((inv) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.name} (Tồn: {inv.quantity} {inv.unitSell})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded border border-green-200 space-y-3">
                <div className="text-xs font-bold text-green-700 uppercase">
                  Thông tin sản phẩm mới
                </div>
                <input
                  name="name"
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Tên sản phẩm (VD: Bia Huda)"
                  value={newProductForm.name}
                  onChange={handleNewProductChange}
                  required={activeTab === "NEW"}
                />
                <div className="flex gap-2">
                  <input
                    name="category"
                    className="w-1/2 border p-2 rounded text-sm"
                    placeholder="Danh mục"
                    value={newProductForm.category}
                    onChange={handleNewProductChange}
                  />
                  <input
                    name="unitSell"
                    className="w-1/2 border p-2 rounded text-sm"
                    placeholder="Đơn vị bán (Lon/Cái)"
                    value={newProductForm.unitSell}
                    onChange={handleNewProductChange}
                    required={activeTab === "NEW"}
                  />
                </div>
                <input
                  type="number"
                  name="price"
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Giá bán lẻ (VNĐ)"
                  value={newProductForm.price}
                  onChange={handleNewProductChange}
                />
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <div className="text-xs font-bold text-gray-400 uppercase">
                Thông tin lô hàng nhập
              </div>

              <input
                name="supplier"
                className="w-full border p-2 rounded text-sm"
                placeholder="Nhà cung cấp..."
                value={stockForm.supplier}
                onChange={handleStockChange}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Đơn vị nhập</label>
                  <select
                    name="unitImport"
                    className="w-full border p-2 rounded text-sm"
                    value={stockForm.unitImport}
                    onChange={handleStockChange}
                  >
                    {IMPORT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Quy đổi (ra lẻ)
                  </label>
                  <input
                    type="number"
                    name="unitImportQuantity"
                    className="w-full border p-2 rounded text-sm"
                    value={stockForm.unitImportQuantity}
                    onChange={handleStockChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">
                    SL Nhập
                  </label>
                  <input
                    type="number"
                    name="quantityImport"
                    className="w-full border p-2 rounded text-sm font-bold text-blue-600"
                    value={stockForm.quantityImport}
                    onChange={handleStockChange}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Giá nhập (1 đơn vị)
                  </label>
                  <input
                    type="number"
                    name="importPrice"
                    className="w-full border p-2 rounded text-sm"
                    value={stockForm.importPrice}
                    onChange={handleStockChange}
                  />
                </div>
              </div>

              <div className="bg-yellow-50 p-2 rounded text-sm border border-yellow-200 space-y-1">
                <div className="flex justify-between">
                  <span>Cộng kho:</span>
                  <span className="font-bold text-blue-700">
                    +{previewTotal} (Lẻ)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền:</span>
                  <span className="font-bold text-red-600">
                    {previewCost.toLocaleString()} đ
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded text-white font-bold shadow transition hover:opacity-90
                    ${activeTab === "EXISTING" ? "bg-blue-600" : "bg-green-600"}`}
              >
                {activeTab === "EXISTING" ? "NHẬP KHO" : "TẠO & NHẬP HÀNG"}
              </button>
            </div>
          </form>
        </div>

        {/* --- PHẦN 3: HIỂN THỊ DỮ LIỆU (BÊN PHẢI) --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h2 className="font-bold text-lg mb-3">🏭 Tồn kho hiện tại</h2>
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-2">Tên hàng</th>
                    <th className="border p-2">Danh mục</th>
                    <th className="border p-2">Tồn kho</th>
                    <th className="border p-2">Đơn vị bán</th>
                    <th className="border p-2">Giá bán</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="border p-2 font-medium">{inv.name}</td>
                      <td className="border p-2 text-gray-500">
                        {inv.category}
                      </td>
                      <td className="border p-2 font-bold text-green-600">
                        {inv.quantity}
                      </td>
                      <td className="border p-2">{inv.unitSell}</td>
                      <td className="border p-2">
                        {inv.price?.toLocaleString()} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h2 className="font-bold text-lg mb-3">📜 Lịch sử nhập hàng</h2>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-2">Tên hàng</th>
                    <th className="border p-2">SL Nhập</th>
                    <th className="border p-2">Tổng cộng vào</th>
                    <th className="border p-2">Giá nhập</th>
                    <th className="border p-2">Tổng chi phí</th>
                    <th className="border p-2">NCC</th>
                    <th className="border p-2">Ngày nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((entry) => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="border p-2 font-medium">
                        {entry.inventoryId?.name ||
                          entry.inventoryName ||
                          "N/A"}
                      </td>
                      <td className="border p-2">
                        {entry.quantityImport} {entry.unitImport}
                      </td>
                      <td className="border p-2 font-bold text-blue-600">
                        +{entry.totalAdded}
                      </td>
                      <td className="border p-2">
                        {entry.importPrice?.toLocaleString()}
                      </td>
                      <td className="border p-2 font-bold text-red-600">
                        {entry.totalCost?.toLocaleString()} đ
                      </td>
                      <td className="border p-2">{entry.supplier}</td>
                      <td className="border p-2 text-gray-500 text-xs">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {importHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center p-4 text-gray-500">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
