import React, { useState, useEffect } from "react";
import {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
} from "../api/news_service/rest/news.api.js";
import { Pencil, Trash2, Plus } from "lucide-react";

const ddMMyyyyToInputDate = (str) => {
  if (!str) return "";
  const [dd, mm, yyyy] = str.split("/");
  return `${yyyy}-${mm}-${dd}`;
};

// Chuyển "yyyy-MM-dd" từ input -> "dd/MM/yyyy" để gửi BE
const inputDateToDdMMyyyy = (str) => {
  if (!str) return "";
  const [yyyy, mm, dd] = str.split("-");
  return `${dd}/${mm}/${yyyy}`;
};

const AdminNews = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formMode, setFormMode] = useState("create"); // 'create' hoặc 'edit'
  const [currentNews, setCurrentNews] = useState({
    title: "",
    summary: "",
    image: "",
    category: "",
    date: "",
    source: "",
    url: "",
  });
  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Hàm load danh sách tin tức
  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await getAllNews();
      // Lấy mảng từ data.news
      if (Array.isArray(data.news)) {
        setNewsList(data.news);
      } else {
        console.error("Dữ liệu từ API không phải mảng:", data);
        setNewsList([]);
        setError("Dữ liệu từ API không đúng định dạng");
      }
    } catch (err) {
      setError("Lỗi tải dữ liệu");
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  // Xử lý thay đổi giá trị input trong form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentNews((prev) => ({ ...prev, [name]: value }));
  };

  // Xử lý submit form (thêm mới hoặc cập nhật)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...currentNews,
        date: inputDateToDdMMyyyy(currentNews.date),
      };
      if (formMode === "create") {
        await createNews(payload);
      } else {
        await updateNews(selectedNewsId, payload);
      }
      // Reset form
      setCurrentNews({
        title: "",
        summary: "",
        image: "",
        category: "",
        date: "",
        source: "",
        url: "",
      });
      setShowModal(false);
      loadNews();
    } catch (err) {
      setError("Lỗi lưu dữ liệu");
    }
  };

  // Mở form chỉnh sửa với dữ liệu của tin đã chọn
  const handleEdit = (newsItem) => {
    setFormMode("edit");
    setSelectedNewsId(newsItem._id);
    setCurrentNews({
      title: newsItem.title || "",
      summary: newsItem.summary || "",
      image: newsItem.image || "",
      category: newsItem.category || "",
      date: newsItem.date || "",
      source: newsItem.source || "",
      url: newsItem.url || "",
    });
    setShowModal(true);
  };

  // Xử lý xóa tin tức với xác nhận từ người dùng
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
      try {
        await deleteNews(id);
        loadNews();
      } catch (err) {
        setError("Lỗi xóa dữ liệu");
      }
    }
  };

  // Mở form thêm mới
  const openForm = () => {
    setFormMode("create");
    setSelectedNewsId(null);
    setCurrentNews({
      title: "",
      summary: "",
      image: "",
      category: "",
      date: "",
      source: "",
      url: "",
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Quản lý News</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <button
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors mb-4"
        onClick={openForm}
      >
        <Plus size={16} /> Thêm mới
      </button>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-md">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Tiêu đề</th>
                <th className="py-2 px-4 border-b">Nguồn tin</th>
                <th className="py-2 px-4 border-b">Ngày tạo</th>
                <th className="py-2 px-4 border-b">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(newsList) && newsList.length > 0 ? (
                newsList.map((newsItem) => (
                  <tr key={newsItem._id} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b">{newsItem.title}</td>
                    <td className="py-2 px-4 border-b">{newsItem.source}</td>
                    <td className="py-2 px-4 border-b">
                      {newsItem.date || ""}
                    </td>
                    <td className="py-2 px-4 border-b flex gap-2">
                      <button
                        onClick={() => handleEdit(newsItem)}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Pencil size={16} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(newsItem._id)}
                        className="flex items-center gap-1 text-red-600 hover:underline"
                      >
                        <Trash2 size={16} /> Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-2 px-4 text-center">
                    Không có tin tức nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm mới/chỉnh sửa tin tức */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-md w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4">
              {formMode === "create" ? "Thêm News mới" : "Chỉnh sửa News"}
            </h2>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Tiêu đề</label>
                <input
                  type="text"
                  name="title"
                  value={currentNews.title}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Tóm tắt</label>
                <textarea
                  name="summary"
                  value={currentNews.summary}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  rows="3"
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">URL hình ảnh</label>
                <input
                  type="url"
                  name="image"
                  value={currentNews.image}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Danh mục</label>
                <input
                  type="text"
                  name="category"
                  value={currentNews.category}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Ngày</label>
                <input
                  type="date"
                  name="date"
                  value={ddMMyyyyToInputDate(currentNews.date)}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Nguồn tin</label>
                <input
                  type="text"
                  name="source"
                  value={currentNews.source}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">URL bài viết</label>
                <input
                  type="url"
                  name="url"
                  value={currentNews.url}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  {formMode === "create" ? "Thêm mới" : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNews;
