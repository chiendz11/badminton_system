import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistancePanel } from "../../src/features/assistant/components/AssistancePanel";
import type {
  AssistanceResult,
  BookingCard,
} from "../../src/features/assistant/api/chat";

const booking: BookingCard = {
  booking_id: "existing-booking",
  choice_id: "server-choice",
  center_name: "Cầu Giấy",
  date: "2030-01-11",
  status: "CONFIRMED",
  total_price_vnd: 160000,
  slots: ["Sân 1: 19:00–20:00, 20:00–21:00"],
  cancellable: true,
};
const base: AssistanceResult = {
  kind: "bookings",
  bookings: [booking],
  centers: [],
  citations: [],
  statistics: null,
  cancellation: null,
  cancellation_pending: false,
  has_more: false,
  coverage: "complete",
  scope: "",
  notice: "",
};
describe("self-service assistance", () => {
  it("selects a server-issued booking choice without granting cancellation consent", () => {
    const post = vi.fn();
    render(<AssistancePanel data={base} disabled={false} post={post} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Yêu cầu hủy booking 1" }),
    );
    expect(post).toHaveBeenCalledWith({
      text: "Chọn booking để xem xác nhận hủy",
      action: "select_booking",
      booking_choice_id: "server-choice",
    });
    expect(
      screen.queryByRole("button", { name: "Xác nhận hủy booking" }),
    ).not.toBeInTheDocument();
  });
  it("confirms cancellation with its own nonce, never a create-booking confirmation", () => {
    const post = vi.fn();
    render(
      <AssistancePanel
        disabled={false}
        post={post}
        data={{
          ...base,
          kind: "cancellation",
          bookings: [],
          cancellation: {
            booking,
            cancellation_id: "cancel-nonce",
            expires_at: "2099-01-01T00:00:00Z",
          },
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận hủy booking" }),
    );
    expect(post).toHaveBeenCalledWith({
      text: "Xác nhận hủy booking",
      action: "confirm_cancellation",
      cancellation_id: "cancel-nonce",
    });
    expect(
      screen.queryByRole("button", { name: "Xác nhận đặt sân" }),
    ).not.toBeInTheDocument();
  });
  it("disables expired consent and only offers recovery while cancellation is uncertain", () => {
    const post = vi.fn();
    const data = {
      ...base,
      cancellation: {
        booking,
        cancellation_id: "expired",
        expires_at: "2000-01-01T00:00:00Z",
      },
    };
    const view = render(
      <AssistancePanel data={data} disabled={false} post={post} />,
    );
    expect(
      screen.getByRole("button", { name: "Xác nhận hủy booking" }),
    ).toBeDisabled();
    view.rerender(
      <AssistancePanel
        data={{ ...data, cancellation_pending: true }}
        disabled={false}
        post={post}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Xác nhận hủy booking" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại hủy" }));
    expect(post).toHaveBeenCalledWith({
      text: "Kiểm tra lại hủy",
      action: "retry_cancellation",
    });
  });
  it("renders sources and explicitly marks partial statistics", () => {
    render(
      <AssistancePanel
        disabled={false}
        post={vi.fn()}
        data={{
          ...base,
          bookings: [],
          kind: "statistics",
          coverage: "partial",
          statistics: {
            confirmed: 2,
            cancelled: 1,
            booked_court_hours: 4,
            confirmed_booking_value_vnd: 320000,
            centers: [{ name: "Cầu Giấy", bookings: 2 }],
          },
          citations: [
            {
              article_id: "cancel-booking",
              title: "Điều kiện hủy booking",
              version: "2026-10-28",
              source_paths: ["docs/BRD.md"],
              excerpt: "Booking đã bắt đầu không hủy được.",
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText("Kết quả chưa bao phủ toàn bộ dữ liệu."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nguồn: Điều kiện hủy booking/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tổng giá trị booking:/)).toBeInTheDocument();
  });
});
