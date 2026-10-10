import React from "react";

const DatePicker = ({ value, onDateChange }) => {
  // Lấy ngày hôm nay theo định dạng "YYYY-MM-DD"
  const today = new Date().toLocaleDateString("en-CA");

  // Tính ngày 1 tháng sau
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const maxDate = oneMonthLater.toISOString().split("T")[0];

  const currentValue = value || today;

  return (
    <input
      type="date"
      value={currentValue}
      min={today}
      max={maxDate}
      onChange={(e) => {
        if (onDateChange) {
          onDateChange(e.target.value);
        }
      }}
      className="px-4 py-2 border rounded bg-white text-black"
      id="bookingDatePickerInput" // <-- THÊM ID NÀY
      data-testid="booking-date-picker-input" // <-- THÊM data-testid NÀY
    />
  );
};

export default DatePicker;
