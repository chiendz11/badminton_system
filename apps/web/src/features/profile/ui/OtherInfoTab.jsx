import React, { useState, useEffect } from "react";
import { Save, MapPin, Activity, Clock, Award, Loader2 } from "lucide-react";
import {
  fetchUserExtra,
  updateUserExtra,
} from "../api/user_service/rest/users.api.js"; // Đảm bảo đường dẫn import đúng file chứa API của bạn
import "../../../shared/styles/UserProfile.css";

const OtherInfoTab = () => {
  // 1. Khởi tạo state với giá trị mặc định an toàn
  const [formData, setFormData] = useState({
    bio: "",
    skillLevel: "Trung bình",
    playStyle: "Toàn diện",
    preferredTime: [], // Mảng rỗng để tránh lỗi .includes()
    location: "",
  });

  const [isLoading, setIsLoading] = useState(true); // State loading khi mới vào
  const [isSaving, setIsSaving] = useState(false); // State loading khi bấm lưu

  // 2. Load dữ liệu khi component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchUserExtra();
        // Merge dữ liệu từ API vào state, ưu tiên dữ liệu API, nếu null thì lấy mặc định
        if (data) {
          setFormData((prev) => ({
            ...prev,
            ...data,
            // Đảm bảo preferredTime luôn là mảng (phòng trường hợp DB lưu null)
            preferredTime: data.preferredTime || [],
          }));
        }
      } catch (error) {
        console.error("Không tải được thông tin bổ sung:", error);
        // Có thể thêm thông báo lỗi nhẹ ở đây nếu muốn
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleTime = (time) => {
    const currentTimes = formData.preferredTime || []; // Fallback an toàn
    if (currentTimes.includes(time)) {
      handleChange(
        "preferredTime",
        currentTimes.filter((t) => t !== time),
      );
    } else {
      handleChange("preferredTime", [...currentTimes, time]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 3. Gọi API update thật
      await updateUserExtra(formData);

      // Thông báo thành công (Bạn có thể thay bằng Toast notification)
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  // Hiển thị loading spinner khi đang fetch dữ liệu ban đầu
  if (isLoading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          background: "white",
          borderRadius: "8px",
        }}
      >
        <Loader2
          className="animate-spin"
          style={{ margin: "0 auto", color: "#0084ff" }}
          size={32}
        />
        <p style={{ marginTop: "10px", color: "#666" }}>Đang tải hồ sơ...</p>
      </div>
    );
  }

  return (
    <div
      className="other-info-container"
      style={{ padding: "20px", background: "white", borderRadius: "8px" }}
    >
      <h3
        className="tab-title"
        style={{ marginBottom: "20px", fontSize: "1.2rem", fontWeight: "bold" }}
      >
        Hồ sơ tìm kiếm
      </h3>
      <p style={{ color: "#666", marginBottom: "25px" }}>
        Cập nhật thông tin này giúp bạn bè dễ dàng tìm thấy bạn dựa trên trình
        độ và sở thích.
      </p>

      <div
        className="info-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* 1. Trình độ */}
        <div className="form-group">
          <label
            style={{
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Award size={18} color="#0084ff" /> Trình độ
          </label>
          <select
            value={formData.skillLevel}
            onChange={(e) => handleChange("skillLevel", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
          >
            <option value="Mới chơi">Mới chơi (Beginner)</option>
            <option value="Trung bình">Trung bình (Intermediate)</option>
            <option value="Khá">Khá (Advanced)</option>
            <option value="Chuyên nghiệp">Chuyên nghiệp (Pro)</option>
          </select>
        </div>

        {/* 2. Lối chơi */}
        <div className="form-group">
          <label
            style={{
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Activity size={18} color="#e74c3c" /> Lối chơi sở trường
          </label>
          <select
            value={formData.playStyle}
            onChange={(e) => handleChange("playStyle", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
          >
            <option value="Tấn công">Tấn công (Smash)</option>
            <option value="Phòng thủ">Phòng thủ / Điều cầu</option>
            <option value="Toàn diện">Toàn diện (All-round)</option>
          </select>
        </div>

        {/* 3. Khu vực */}
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label
            style={{
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <MapPin size={18} color="#27ae60" /> Khu vực thường chơi
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Cầu Giấy, Hà Nội..."
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
          />
        </div>

        {/* 4. Thời gian */}
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label
            style={{
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <Clock size={18} color="#f39c12" /> Thời gian rảnh
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {["Sáng", "Chiều", "Tối", "Cuối tuần"].map((time) => (
              <button
                key={time}
                onClick={() => handleToggleTime(time)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: formData.preferredTime.includes(time)
                    ? "2px solid #0084ff"
                    : "1px solid #ddd",
                  background: formData.preferredTime.includes(time)
                    ? "#eef5ff"
                    : "white",
                  color: formData.preferredTime.includes(time)
                    ? "#0084ff"
                    : "#555",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Bio */}
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label style={{ fontWeight: "600" }}>Giới thiệu ngắn (Bio)</label>
          <textarea
            rows="4"
            placeholder="Viết đôi dòng về bản thân để mọi người hiểu rõ hơn..."
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              borderRadius: "6px",
              border: "1px solid #ddd",
              resize: "none",
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: "25px", textAlign: "right" }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            background: isSaving ? "#94caff" : "#0084ff",
            color: "white",
            padding: "10px 25px",
            borderRadius: "6px",
            border: "none",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "background 0.3s",
          }}
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
};

export default OtherInfoTab;
