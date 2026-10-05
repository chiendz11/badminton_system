import React from "react";

const BookingTable = ({
  courts,
  bookingData,
  toggleBookingStatus,
  times,
  slotCount,
  currentUserId,
}) => {
  return (
    <div className="mt-4 bg-green-100 p-2 rounded-md">
      <table
        className="table-fixed w-full"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th
              className="p-2 bg-green-100 text-center font-bold text-black"
              style={{ width: "60px", height: "50px" }}
            ></th>
            {Array.from({ length: slotCount }, (_, i) => {
              // const startHour = times[i]; // Có thể dùng nếu cần hiển thị giờ
              // const endHour = times[i + 1];
              return (
                <th
                  key={i}
                  className="bg-green-100 text-black relative"
                  style={{ width: "50px", height: "50px" }}
                >
                  <div
                    className="absolute bottom-0 bg-yellow-500"
                    style={{ left: "-0.5px", width: "2px", height: "4px" }}
                  />
                  <div
                    className="absolute font-bold text-[10px]"
                    style={{
                      left: 0,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {times[i]}h
                  </div>
                </th>
              );
            })}
            {/* Cột mốc giờ cuối cùng */}
            <th
              className="relative bg-green-100"
              style={{ width: "0px", padding: 0 }}
            >
              <div
                className="absolute font-bold text-[10px]"
                style={{
                  left: 0,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {times[slotCount]}h
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {courts.map((court, rowIndex) => {
            // FIX 1: Lấy ID chuẩn xác (hỗ trợ cả id, _id, courtId)
            const courtId = court.id || court._id || court.courtId;

            return (
              <tr key={rowIndex} style={{ border: "1px solid black" }}>
                <td
                  className="bg-green-200 text-black text-center font-bold"
                  style={{ width: "60px", height: "40px", padding: "2px" }}
                >
                  {court.name}
                </td>
                {Array.from({ length: slotCount }, (_, colIndex) => {
                  // Lấy dữ liệu thô từ mapping
                  let rawStatus =
                    bookingData && bookingData[courtId]
                      ? bookingData[courtId][colIndex]
                      : "trống";

                  // FIX 2: Kiểm tra null/undefined để tránh crash
                  if (rawStatus === undefined || rawStatus === null) {
                    rawStatus = "trống";
                  }

                  const isObject = typeof rawStatus === "object";

                  // FIX 3: Lấy status string an toàn, ép kiểu String
                  const statusStr = isObject
                    ? rawStatus.status?.toLowerCase() || ""
                    : String(rawStatus).toLowerCase();

                  const username = isObject ? rawStatus.username || "" : "";
                  let userId = isObject ? rawStatus.userId : "";

                  // Xử lý userId nếu nó là chuỗi JSON
                  if (
                    userId &&
                    typeof userId === "string" &&
                    userId.includes("_id")
                  ) {
                    try {
                      const parsed = JSON.parse(userId);
                      userId = parsed._id || userId;
                    } catch (e) {
                      // Silent fail
                    }
                  }

                  let status;

                  // Logic xác định status hiển thị
                  if (statusStr === "mypending") {
                    status = "myPending";
                  } else if (
                    statusStr.includes("đã đặt") ||
                    statusStr.includes("booked") ||
                    statusStr === "paid"
                  ) {
                    status = "đã đặt";
                  } else if (statusStr.includes("pending")) {
                    status =
                      userId &&
                      currentUserId &&
                      userId.toString() === currentUserId.toString()
                        ? "myPending"
                        : "pending";
                  } else if (statusStr === "locked") {
                    status = "locked";
                  } else {
                    status = "trống";
                  }

                  // Locked và đã đặt thì không được click
                  const clickable =
                    status === "trống" || status === "myPending";

                  // Mapping màu sắc
                  const bgColor =
                    status === "trống"
                      ? "bg-white"
                      : status === "pending"
                        ? "bg-yellow-500"
                        : status === "myPending"
                          ? "bg-green-500"
                          : status === "đã đặt"
                            ? "bg-red-500"
                            : "bg-gray-400"; // Locked: Màu xám

                  // Màu chữ
                  const textColor =
                    status === "trống" || status === "pending"
                      ? "text-black"
                      : "text-white";

                  return (
                    <td
                      key={colIndex}
                      className="relative"
                      style={{
                        width: "50px",
                        height: "40px",
                        padding: "0",
                        border: "1px solid black",
                        pointerEvents: clickable ? "auto" : "none",
                        cursor: clickable ? "pointer" : "not-allowed",
                      }}
                      onClick={() => {
                        if (clickable) {
                          toggleBookingStatus(rowIndex, colIndex);
                        }
                      }}
                    >
                      <div
                        className={`h-full flex items-center justify-center ${bgColor} ${textColor}`}
                        title={
                          status === "locked"
                            ? "Đã quá giờ đặt"
                            : username
                              ? `${status} bởi ${username}`
                              : status
                        }
                      >
                        {/* Có thể thêm icon hoặc text ngắn gọn ở đây nếu cần */}
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
