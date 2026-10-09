import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingAssistant from "../../src/features/assistant/pages/BookingAssistant";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import {
  createConversation,
  getConversation,
  sendMessage,
} from "../../src/features/assistant/api/chat";

vi.mock("../../src/features/assistant/api/chat", () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  getTrace: vi.fn(),
}));
const response = {
  conversation_id: "conversation-1",
  assistant_message: "Có sân trống",
  action: "SEARCH_RESULTS",
  options: [
    {
      option_id: "option-1",
      center_name: "Cầu Giấy",
      court_name: "Sân 1",
      start: "2030-01-08T19:00:00+07:00",
      end: "2030-01-08T21:00:00+07:00",
      total_price_vnd: 160000,
      relaxed_fields: [],
    },
  ],
  selected_option_id: null,
  confirmation_id: null,
  requires_confirmation: false,
  booking: null,
  provider: "fake",
  slot_minutes: 60,
  plan_version: 1,
};
function mount() {
  return render(
    <MemoryRouter>
      <SessionProvider
        session={{ profile: { userId: "customer", name: "Khách" } }}
      >
        <BookingAssistant />
      </SessionProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(createConversation).mockResolvedValue({
    conversation_id: "conversation-1",
    provider: "fake",
  });
});
describe("assistant booking consent", () => {
  it("shows separate selection and final confirmation, sending only the server nonce", async () => {
    vi.mocked(sendMessage)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({
        ...response,
        selected_option_id: "option-1",
        confirmation_id: "nonce-1",
        requires_confirmation: true,
        action: "CONFIRM_BOOKING",
      })
      .mockResolvedValueOnce({
        ...response,
        action: "BOOKED",
        options: [],
        booking: { id: "booking-1", status: "CONFIRMED", totalPrice: 160000 },
      });
    mount();
    fireEvent.change(screen.getByLabelText("Yêu cầu đặt sân"), {
      target: { value: "Mai 19:00 chơi 2 tiếng" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Chọn sân" }));
    const final = await screen.findByRole("button", {
      name: "Xác nhận đặt sân",
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendMessage).mock.calls[1][1]).toMatchObject({
      action: "select",
      option_id: "option-1",
    });
    fireEvent.click(final);
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(3));
    expect(vi.mocked(sendMessage).mock.calls[2][1]).toMatchObject({
      action: "confirm",
      confirmation_id: "nonce-1",
    });
    expect(await screen.findByText(/booking-1/)).toBeInTheDocument();
  });
  it("recovers a pending request after reload with its original client message key", async () => {
    localStorage.setItem("booking-assistant:customer", "conversation-1");
    const pending = {
      text: "Xác nhận đặt sân",
      client_message_id: "original-key",
      action: "confirm" as const,
      confirmation_id: "nonce-1",
    };
    vi.mocked(getConversation).mockResolvedValue({
      conversation_id: "conversation-1",
      pending_turn: pending,
      messages: [{ role: "assistant", text: "Chọn sân", response }],
      state: {
        options: response.options,
        selected_option_id: "option-1",
        confirmation_id: "nonce-1",
        booking: null,
        pending_booking: { key: "core-key" },
        next_action: "RETRY_BOOKING",
      },
    });
    vi.mocked(sendMessage).mockResolvedValue({
      ...response,
      action: "BOOKED",
      options: [],
      booking: {
        id: "recovered-booking",
        status: "CONFIRMED",
        totalPrice: 160000,
      },
    });
    mount();
    const retry = await screen.findByRole("button", {
      name: "Thử lại yêu cầu vừa gửi",
    });
    expect(
      screen.queryByRole("button", { name: "Xác nhận đặt sân" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hội thoại mới" }),
    ).toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith("conversation-1", pending),
    );
  });
});
