import type { AssistanceResult, BookingCard, ChatRequest } from "../api/chat";

export function AssistancePanel({
  data,
  disabled,
  post,
}: {
  data: AssistanceResult;
  disabled: boolean;
  post: (request: Omit<ChatRequest, "client_message_id">) => unknown;
}) {
  function booking(card: BookingCard) {
    return (
      <div className="space-y-1">
        <p className="font-semibold">
          {card.center_name} · {card.date}
        </p>
        <p>Mã booking: {card.booking_id}</p>
        <p>{card.slots.join("; ")}</p>
        <p>
          Trạng thái: {card.status === "CANCELLED" ? "Đã hủy" : "Đã xác nhận"}
        </p>
        <p>Giá trị booking: {card.total_price_vnd.toLocaleString("vi-VN")} đ</p>
      </div>
    );
  }
  const preview = data.cancellation;
  const expired = preview
    ? Date.parse(preview.expires_at) <= Date.now()
    : false;
  return (
    <section aria-label="Kết quả trợ lý" className="space-y-4">
      {data.scope && <p>Phạm vi: {data.scope}</p>}
      {data.notice && (
        <p role="status" className="rounded bg-amber-50 p-3">
          {data.notice}
        </p>
      )}
      {data.coverage === "partial" && (
        <p>Kết quả chưa bao phủ toàn bộ dữ liệu.</p>
      )}
      {data.bookings.map((card, index) => (
        <article
          key={card.choice_id}
          className="rounded border bg-white p-4 space-y-3"
        >
          <p>Booking {index + 1}</p>
          {booking(card)}
          {data.kind === "bookings" && card.cancellable && (
            <button
              className="rounded border border-red-600 px-3 py-2 text-red-800 disabled:opacity-50"
              disabled={disabled || data.cancellation_pending}
              onClick={() =>
                post({
                  text: "Chọn booking để xem xác nhận hủy",
                  action: "select_booking",
                  booking_choice_id: card.choice_id,
                })
              }
            >
              Yêu cầu hủy booking {index + 1}
            </button>
          )}
        </article>
      ))}
      {data.has_more && (
        <button
          disabled={disabled}
          className="underline"
          onClick={() =>
            post({ text: "Xem thêm lịch", action: "more_bookings" })
          }
        >
          Xem thêm booking
        </button>
      )}
      {data.statistics && (
        <div className="rounded border bg-white p-4 space-y-2">
          <p>Booking còn xác nhận: {data.statistics.confirmed}</p>
          <p>Booking đã hủy: {data.statistics.cancelled}</p>
          <p>Tổng giờ-sân đã đặt: {data.statistics.booked_court_hours}</p>
          <p>
            Tổng giá trị booking:{" "}
            {data.statistics.confirmed_booking_value_vnd.toLocaleString(
              "vi-VN",
            )}{" "}
            đ
          </p>
          <ul>
            {data.statistics.centers.map((center) => (
              <li key={center.name}>
                {center.name}: {center.bookings} booking
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data.centers.map((center) => (
          <article
            key={center.center_id}
            className="rounded border bg-white p-4 space-y-2"
          >
            <h3 className="font-bold">{center.name}</h3>
            <p>{center.address}</p>
            <p>Giờ mở cửa: {center.opening_hours || "Chưa có dữ liệu"}</p>
            <p>Sân hoạt động: {center.active_courts ?? "Chưa có dữ liệu"}</p>
            {center.description && <p>{center.description}</p>}
            {center.pricing.length ? (
              <ul>
                {center.pricing.map((band, index) => (
                  <li key={index}>{band}</li>
                ))}
              </ul>
            ) : (
              <p>Chưa có bảng giá để đối chiếu.</p>
            )}
          </article>
        ))}
      </div>
      {data.citations.map((source) => (
        <details key={source.article_id} className="rounded border p-3">
          <summary>
            Nguồn: {source.title} · phiên bản {source.version}
          </summary>
          <p className="mt-2">{source.excerpt}</p>
        </details>
      ))}
      {preview && !data.cancellation_pending && (
        <article className="rounded border border-red-300 bg-red-50 p-4 space-y-3">
          <h3 className="font-bold">Xác nhận hủy booking</h3>
          {booking(preview.booking)}
          <p>Hủy lịch sẽ giải phóng sân. Thao tác này không xử lý hoàn tiền.</p>
          {expired && (
            <p>Xác nhận đã hết hạn. Hãy tra cứu và chọn lại booking.</p>
          )}
          <button
            className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
            disabled={disabled || expired}
            onClick={() =>
              post({
                text: "Xác nhận hủy booking",
                action: "confirm_cancellation",
                cancellation_id: preview.cancellation_id,
              })
            }
          >
            Xác nhận hủy booking
          </button>
          <button
            className="ml-3 underline"
            disabled={disabled}
            onClick={() =>
              post({ text: "Giữ booking", action: "dismiss_cancellation" })
            }
          >
            Giữ booking
          </button>
        </article>
      )}
      {data.cancellation_pending && (
        <div role="status" className="rounded bg-amber-100 p-4">
          <p>
            Kết quả hủy chưa xác định. Kiểm tra lại trước khi thực hiện tác vụ
            khác.
          </p>
          <button
            disabled={disabled}
            className="underline"
            onClick={() =>
              post({ text: "Kiểm tra lại hủy", action: "retry_cancellation" })
            }
          >
            Kiểm tra lại hủy
          </button>
        </div>
      )}
    </section>
  );
}
