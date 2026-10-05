import {
  formatMinute,
  type Availability,
  type Booking,
  type Selection,
} from "@badminton/booking-contracts";
export * from "./api";
export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export function SlotGrid({
  availability,
  selected,
  onChange,
  disabled = false,
}: {
  availability: Availability;
  selected: Selection[];
  onChange: (value: Selection[]) => void;
  disabled?: boolean;
}) {
  const minutes = availability.courts[0]?.slots.map((s) => s.minute) || [];
  function toggle(courtId: string, minute: number) {
    const current = selected.find((s) => s.courtId === courtId)?.slots || [];
    const slots = current.includes(minute)
      ? current.filter((s) => s !== minute)
      : [...current, minute].sort((a, b) => a - b);
    onChange(
      [
        ...selected.filter((s) => s.courtId !== courtId),
        ...(slots.length ? [{ courtId, slots }] : []),
      ].sort((a, b) => a.courtId.localeCompare(b.courtId)),
    );
  }
  return (
    <>
      <div className="slot-legend">
        <span>
          <i className="dot free" />
          Còn trống
        </span>
        <span>
          <i className="dot chosen" />
          Đang chọn
        </span>
        <span>
          <i className="dot held" />
          Đang giữ
        </span>
        <span>
          <i className="dot booked" />
          Đã đặt / đóng
        </span>
      </div>
      <div className="slot-scroll">
        <table className="slot-table">
          <thead>
            <tr>
              <th>Sân / Giờ</th>
              {minutes.map((minute) => (
                <th key={minute}>{formatMinute(minute)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {availability.courts.map((court) => (
              <tr key={court.id}>
                <th>
                  {court.name}
                  <small>{court.surface}</small>
                </th>
                {court.slots.map((slot) => {
                  const chosen = selected.some(
                    (s) =>
                      s.courtId === court.id && s.slots.includes(slot.minute),
                  );
                  return (
                    <td key={slot.minute}>
                      <button
                        aria-label={`${court.name} ${formatMinute(slot.minute)}`}
                        aria-pressed={chosen}
                        disabled={disabled || !slot.available}
                        className={`slot ${chosen ? "selected" : slot.state.toLowerCase()}`}
                        onClick={() => toggle(court.id, slot.minute)}
                        title={
                          slot.available
                            ? money(slot.price)
                            : slot.state === "HELD"
                              ? "Đang được giữ chỗ"
                              : "Không khả dụng"
                        }
                      >
                        {slot.available
                          ? `${Math.round(slot.price / 1000)}k`
                          : slot.state === "HELD"
                            ? "Giữ"
                            : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function BookingList({
  items,
  onCancel,
  busy = false,
}: {
  items: Booking[];
  onCancel: (id: string) => void;
  busy?: boolean;
}) {
  if (!items.length)
    return (
      <div className="empty">Chưa có lịch đặt sân trong danh sách này.</div>
    );
  return (
    <div className="booking-list">
      {items.map((booking) => (
        <article className="booking-item" key={booking.id}>
          <div>
            <span
              className={`badge ${booking.status === "CANCELLED" ? "muted" : ""}`}
            >
              {booking.status === "CANCELLED"
                ? "Đã hủy"
                : booking.type === "FIXED"
                  ? "Lịch cố định"
                  : "Đã xác nhận"}
            </span>
            <h3>{booking.centerName}</h3>
            <p>
              {booking.date} · {booking.userName}
            </p>
            {booking.selections.map((s) => (
              <p key={s.courtId}>
                {s.courtName}: {s.slots.map(formatMinute).join(", ")}
              </p>
            ))}
            <small>Mã đặt: {booking.id.slice(0, 8)}</small>
          </div>
          <div className="booking-price">
            <strong>{money(booking.totalPrice)}</strong>
            {booking.status === "CONFIRMED" && (
              <button
                className="button subtle"
                disabled={busy}
                onClick={() => onCancel(booking.id)}
              >
                Hủy lịch
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
