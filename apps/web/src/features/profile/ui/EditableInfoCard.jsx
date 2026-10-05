import React, { useState, useEffect, useRef } from "react";

const EditableInfoCard = ({ label, value, onConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleEditClick = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const handleConfirmClick = () => {
    onConfirm(tempValue);
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setTempValue(value);
  };

  const sanitizedLabel = label
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  return (
    <div
      id={`${sanitizedLabel}-info-card`}
      className="info-card enhanced flex items-center justify-between w-full p-3 border-b"
    >
      {/* 1. CỘT TRÁI */}
      <div className="info-value-container flex-grow mr-4">
        <div
          id={`${sanitizedLabel}-label`}
          className="info-label text-sm font-medium text-gray-500"
        >
          {label}
        </div>

        <div className="info-value mt-1">
          {isEditing ? (
            <input
              ref={inputRef}
              id={`${sanitizedLabel}-input`}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="block w-full text-lg font-semibold text-gray-900 p-1
                         border border-blue-500 rounded
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          ) : (
            <span
              id={`${sanitizedLabel}-display-value`}
              className="block text-lg font-semibold text-gray-900 truncate"
            >
              {value || "..."}
            </span>
          )}
        </div>
      </div>

      {/* 2. CỘT PHẢI (Cụm nút) */}
      <div className="info-card-actions flex flex-shrink-0 items-center space-x-2">
        {isEditing ? (
          <>
            {/* --- Nút Xác nhận (V) --- */}
            <button
              id={`${sanitizedLabel}-confirm-button`}
              // 💡 SỬA LỖI: Thêm '!' để "ép" 'static'
              className="edit-info-btn confirm !static p-2 text-green-600 rounded-full
                         hover:text-green-800 hover:bg-green-100
                         focus:outline-none focus:ring-2 focus:ring-green-400
                         active:scale-95
                         transition-all duration-150 ease-in-out"
              title="Xác nhận"
              onClick={handleConfirmClick}
            >
              <i className="fas fa-check w-4 h-4"></i>
            </button>

            {/* --- Nút Hủy (X) --- */}
            <button
              id={`${sanitizedLabel}-cancel-button`}
              // 💡 SỬA LỖI: Thêm '!' để "ép" 'static'
              className="edit-info-btn cancel !static p-2 text-red-500 rounded-full
                         hover:text-red-700 hover:bg-red-100
                         focus:outline-none focus:ring-2 focus:ring-red-400
                         active:scale-95
                         transition-all duration-150 ease-in-out"
              title="Hủy"
              onClick={handleCancelClick}
            >
              <i className="fas fa-times w-4 h-4"></i>
            </button>
          </>
        ) : (
          /* --- Nút Sửa (Cây bút) --- */
          <button
            id={`${sanitizedLabel}-edit-button`}
            className="edit-info-btn p-2 text-blue-600 rounded-full
                       hover:text-blue-800 hover:bg-blue-100
                       focus:outline-none focus:ring-2 focus:ring-blue-400
                       active:scale-95
                       transition-all duration-150 ease-in-out"
            title="Chỉnh sửa"
            onClick={handleEditClick}
          >
            <i className="fas fa-pen w-4 h-4"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default EditableInfoCard;
