import React from "react";

/**
 * Component Spinner tái sử dụng, tối ưu cho hệ thống đặt lịch.
 * * @param {boolean} [fullPage=false] - Nếu 'true', spinner sẽ chiếm toàn bộ màn hình (dùng cho tải trang).
 * @param {string} [color='#28a745'] - Màu chính của spinner. (Tôi đổi sang màu xanh lá cây cho hợp chủ đề thể thao/sân cầu lông).
 * @param {string} [size='36px'] - Kích thước (width/height) của spinner.
 * @param {string} [thickness='4px'] - Độ dày của vòng spinner.
 */
const LoadingSpinner = ({
  fullPage = false,
  color = "#28a745", // Màu xanh lá cây (sân cầu) hoặc vàng '#ffc107' (trái cầu)
  size = "36px",
  thickness = "4px",
}) => {
  // 1. Định nghĩa keyframes MỘT LẦN
  // Chúng ta đưa ra ngoài để không bị lặp lại trong cả hai trường hợp
  const keyframes = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  // 2. CSS cho spinner - sử dụng các prop để linh hoạt
  const spinnerStyle = {
    border: `${thickness} solid rgba(0, 0, 0, 0.1)`,
    width: size,
    height: size,
    borderRadius: "50%",
    borderLeftColor: color, // Sử dụng prop 'color'
    animation: "spin 1s ease infinite",
  };

  // 3. CSS cho lớp phủ (overlay) toàn trang
  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)", // Nền mờ
    zIndex: 50, // Nằm trên cùng
  };

  // 4. Tạo spinner element
  const spinnerElement = <div style={spinnerStyle}></div>;

  // 5. Trả về component
  // Chúng ta dùng React.Fragment (<>) để bọc và render keyframes CHỈ MỘT LẦN
  return (
    <>
      <style>{keyframes}</style>

      {/* Sử dụng toán tử ba ngôi để chọn cách render */}
      {fullPage ? (
        <div style={overlayStyle}>{spinnerElement}</div>
      ) : (
        spinnerElement
      )}
    </>
  );
};

export default LoadingSpinner;
