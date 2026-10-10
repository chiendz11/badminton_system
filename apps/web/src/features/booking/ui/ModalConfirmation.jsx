import React, { useState } from "react";

const ModalConfirmation = ({
  onAction,
  isLoading = false,
  title = "Xác nhận hành động",
  message = "Bạn có chắc chắn muốn thực hiện hành động này không?",
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);

  const handleMouseDown = (e) => {
    setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };

  const handleMouseMove = (e) => {
    if (dragStart) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setDragOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div
        className="relative bg-green-700 rounded-lg p-6 w-11/12 max-w-md z-10 cursor-move select-none"
        onMouseDown={handleMouseDown}
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
      >
        <button
          disabled={isLoading}
          onClick={() => onAction("cancel")}
          className="absolute top-2 right-2 text-white font-bold text-xl hover:text-gray-300 transition"
          aria-label="Close Modal"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-white text-center">
          {title}
        </h2>
        <div className="mb-4 text-base text-white">{message}</div>
        <div className="flex justify-end gap-4">
          <button
            disabled={isLoading}
            onClick={() => onAction("cancel")}
            className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition"
          >
            Hủy
          </button>
          <button
            disabled={isLoading}
            onClick={() => onAction("confirm")}
            className="px-4 py-2 bg-yellow-300 text-black rounded hover:bg-yellow-400 transition"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmation;
