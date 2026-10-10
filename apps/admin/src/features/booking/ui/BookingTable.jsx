import React from "react";

/**
 * BookingTable (Admin View)
 * Cập nhật:
 * - Fix lỗi không nhận diện được dữ liệu do sai key (dùng court.courtId).
 * - Hiển thị đúng màu cho trạng thái "locked" (xám).
 * - Hiển thị tên người đặt cho các trạng thái pending/booked/processing.
 */
const BookingTable = ({ courts, bookingData, times, slotCount }) => {
  return (
    <div className="mt-4 transparent p-2 rounded-md">
      <table
        className="table-fixed w-full"
        style={{ borderCollapse: "collapse" }}
      >
        {/* --- HEADERS (GIỜ) --- */}
        <thead>
          <tr>
            <th
              className="p-2 transparent text-center font-bold text-black"
              style={{ width: "80px" }}
            ></th>
            {Array.from({ length: slotCount }, (_, i) => {
              const startHour = times[i];
              const endHour = times[i + 1];
              return (
                <th
                  key={i}
                  className="transparent text-black relative"
                  style={{ width: "60px" }}
                >
                  <div
                    className="absolute bottom-0 bg-yellow-500"
                    style={{ left: "-0.5px", width: "2px", height: "6px" }}
                  />
                  <div
                    className="absolute font-bold text-[10px]"
                    style={{
                      left: 0,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {startHour}:00
                  </div>
                  {i === slotCount - 1 && (
                    <>
                      <div
                        className="absolute bottom-0 bg-yellow-500"
                        style={{ right: "-0.5px", width: "2px", height: "5px" }}
                      />
                      <div
                        className="absolute font-bold text-[10px]"
                        style={{
                          right: 0,
                          top: "50%",
                          transform: "translate(50%, -50%)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {endHour}:00
                      </div>
                    </>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* --- BODY (DANH SÁCH SÂN & SLOT) --- */}
        <tbody>
          {courts.map((court, rowIndex) => {
            // 💡 QUAN TRỌNG: Lấy đúng ID để map với bookingData
            // Dữ liệu mới dùng courtId, dữ liệu cũ có thể dùng _id hoặc id
            const courtKey = court.courtId || court._id || court.id;

            // Lấy mảng trạng thái của sân này
            const courtSchedule = bookingData ? bookingData[courtKey] : [];

            return (
              <tr key={rowIndex} style={{ border: "1px solid black" }}>
                {/* Tên sân */}
                <td
                  className="bg-green-200 text-black text-center font-bold"
                  style={{ width: "80px", padding: "2px" }}
                >
                  {court.name}
                </td>

                {/* Các slot giờ */}
                {Array.from({ length: slotCount }, (_, colIndex) => {
                  // Lấy trạng thái raw từ mảng
                  const rawStatus =
                    Array.isArray(courtSchedule) &&
                    colIndex < courtSchedule.length
                      ? courtSchedule[colIndex]
                      : "trống";

                  // Xử lý status: có thể là String ("trống", "locked") hoặc Object ({status: "pending", ...})
                  let statusStr = "";
                  let name = "";

                  if (typeof rawStatus === "object" && rawStatus !== null) {
                    statusStr = rawStatus.status
                      ? rawStatus.status.toLowerCase()
                      : "trống";
                    name = rawStatus.name || "";
                  } else {
                    statusStr = String(rawStatus).toLowerCase();
                  }

                  // Chuẩn hóa trạng thái để map màu
                  let displayStatus;
                  if (statusStr.includes("locked")) {
                    displayStatus = "locked";
                  } else if (
                    statusStr.includes("đã đặt") ||
                    statusStr.includes("booked") ||
                    statusStr.includes("paid")
                  ) {
                    displayStatus = "booked";
                  } else if (statusStr.includes("pending")) {
                    displayStatus = "pending";
                  } else if (
                    statusStr.includes("chờ xử lý") ||
                    statusStr.includes("processing")
                  ) {
                    displayStatus = "processing";
                  } else {
                    displayStatus = "none"; // Trống
                  }

                  // Map màu sắc
                  const bgColor =
                    displayStatus === "booked"
                      ? "bg-red-500"
                      : displayStatus === "pending"
                        ? "bg-yellow-500"
                        : displayStatus === "processing"
                          ? "bg-[#0288D1]"
                          : displayStatus === "locked"
                            ? "bg-gray-300" // Màu xám cho locked
                            : "bg-white";

                  // Màu chữ
                  const textColor =
                    displayStatus === "booked" ||
                    displayStatus === "pending" ||
                    displayStatus === "processing"
                      ? "text-white"
                      : "text-black";

                  return (
                    <td
                      key={colIndex}
                      style={{
                        width: "60px",
                        height: "40px",
                        padding: "0",
                        border: "1px solid black",
                      }}
                    >
                      <div
                        className={`h-full flex items-center justify-center ${bgColor} ${textColor} text-xs font-medium cursor-default select-none`}
                        title={
                          displayStatus === "locked"
                            ? "Đã qua giờ"
                            : name
                              ? `${displayStatus.toUpperCase()} bởi ${name}`
                              : displayStatus
                        }
                      >
                        {/* Chỉ hiển thị tên nếu không phải là locked hoặc trống */}
                        {(displayStatus === "booked" ||
                          displayStatus === "pending" ||
                          displayStatus === "processing") &&
                        name
                          ? name
                          : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;
