import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchRatings,
  deleteRating,
} from "../api/rating_service/rest/rating.api.js";
import { getAllCentersGQL } from "../../centers/api/center_service/graphql/center.api.js";

export default function RatingManagement() {
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // để hiển thị loading khi xóa

  // --- Load all centers từ GraphQL ---
  const loadCenters = async () => {
    try {
      const data = await getAllCentersGQL();
      setCenters(data);
      if (data.length > 0) setSelectedCenter(data[0].centerId);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách trung tâm");
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  // --- Load ratings khi selectedCenter thay đổi ---
  useEffect(() => {
    if (selectedCenter) loadRatings(selectedCenter);
  }, [selectedCenter]);

  const loadRatings = async (centerId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchRatings(centerId);
      // Backend trả về: { reviews: [...] }
      setRatings(
        Array.isArray(response.data?.reviews) ? response.data.reviews : [],
      );
    } catch (err) {
      setError(err.message || "Failed to load ratings");
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
    try {
      setDeletingId(id); // bật loading cho rating đang xóa
      await deleteRating(id);
      // Xóa khỏi state ngay lập tức
      setRatings((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.message || "Xóa thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Quản lý đánh giá</h2>

      {error && <p className="text-red-500">{error}</p>}

      <div className="mb-4">
        <label htmlFor="center-select" className="mr-2">
          Chọn trung tâm:
        </label>
        <select
          id="center-select"
          value={selectedCenter || ""}
          onChange={(e) => setSelectedCenter(e.target.value)}
          className="border rounded p-1"
        >
          {centers.map((c) => (
            <option key={c.centerId} value={c.centerId}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Đang tải đánh giá...</p>}

      {!loading && selectedCenter && (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2">Người dùng</th>
              <th className="py-2">Sao</th>
              <th className="py-2">Bình luận</th>
              <th className="py-2">Ngày tạo</th>
              <th className="py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r) => (
              <tr key={r.id} className="text-center border-t">
                <td className="py-2">{r.user}</td>
                <td className="py-2">{r.stars} ★</td>
                <td className="py-2">{r.comment}</td>
                <td className="py-2">
                  {new Date(r.date).toLocaleDateString("vi-VN")}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className={`px-2 py-1 text-white rounded ${deletingId === r.id ? "bg-gray-400 cursor-not-allowed" : "bg-red-500"}`}
                    disabled={deletingId === r.id}
                  >
                    {deletingId === r.id ? "Đang xóa..." : "Xóa"}
                  </button>
                </td>
              </tr>
            ))}
            {ratings.length === 0 && (
              <tr>
                <td colSpan="5" className="py-4">
                  Chưa có đánh giá cho trung tâm này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
