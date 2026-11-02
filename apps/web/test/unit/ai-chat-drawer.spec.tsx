import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/app/App.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import {
  createConversation,
  sendMessage,
} from "../../src/features/assistant/api/chat";

vi.mock("../../src/features/assistant/api/chat", () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  getTrace: vi.fn(),
}));

const mockAiResponse = {
  conversation_id: "conv-123",
  assistant_message: "Chào bạn, tôi tìm thấy 2 sân phù hợp tại Cầu Giấy.",
  action: "SEARCH_RESULTS",
  options: [
    {
      option_id: "opt-1",
      center_name: "Cầu Giấy",
      court_name: "Sân 1",
      start: "2030-01-08T19:00:00+07:00",
      end: "2030-01-08T21:00:00+07:00",
      total_price_vnd: 200000,
      relaxed_fields: [],
    },
  ],
  selected_option_id: null,
  confirmation_id: null,
  requires_confirmation: false,
  booking: null,
  provider: "real",
  slot_minutes: 60,
  plan_version: 1,
};

function renderApp(sessionProfile: any = null) {
  return render(
    <SessionProvider session={sessionProfile ? { profile: sessionProfile } : null}>
      <App />
    </SessionProvider>,
  );
}

describe("AI Chat Drawer & Auth Guard Flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(createConversation).mockResolvedValue({
      conversation_id: "conv-123",
      provider: "real",
    });
    vi.mocked(sendMessage).mockResolvedValue(mockAiResponse);
  });

  it("shows login requirement popup with 'Đi đăng nhập' and 'Hủy' when not logged in", async () => {
    renderApp(null);

    // Wait for page to mount and find floating chat toggle button
    const chatBtn = await screen.findByRole("button", { name: "Trợ lý đặt sân" });
    fireEvent.click(chatBtn);

    // Must show notification modal saying "Bạn hãy đăng nhập"
    expect(await screen.findByText(/Bạn hãy đăng nhập/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yêu cầu đăng nhập" })).toBeInTheDocument();

    // Must contain exactly 2 action buttons: "Đi đăng nhập" and "Hủy"
    const cancelBtn = screen.getByRole("button", { name: "Hủy" });
    const loginBtn = screen.getByRole("button", { name: "Đi đăng nhập" });
    expect(cancelBtn).toBeInTheDocument();
    expect(loginBtn).toBeInTheDocument();

    // Clicking 'Hủy' closes the modal
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Bạn hãy đăng nhập/i)).not.toBeInTheDocument();
    });
  });

  it("navigates from 'Đi đăng nhập' to login form, logs in and launches chat drawer", async () => {
    renderApp(null);

    // Click chat icon
    const chatBtn = await screen.findByRole("button", { name: "Trợ lý đặt sân" });
    fireEvent.click(chatBtn);
    expect(await screen.findByText(/Bạn hãy đăng nhập/i)).toBeInTheDocument();

    // Click 'Đi đăng nhập'
    fireEvent.click(screen.getByRole("button", { name: "Đi đăng nhập" }));

    // Login modal appears
    expect(await screen.findByRole("heading", { name: "Đăng nhập ĐẶT SÂN 247" })).toBeInTheDocument();

    // Click quick login with demo account
    const quickLoginBtn = screen.getByRole("button", {
      name: /Đăng nhập nhanh với tài khoản Demo/i,
    });
    fireEvent.click(quickLoginBtn);

    // After login, the Amazon Q style drawer opens automatically
    expect(await screen.findByLabelText("Khung chat trợ lý AI")).toBeInTheDocument();
    expect(
      screen.getByText("Tôi có thể giúp gì cho bạn hôm nay?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tìm sân cầu lông trống tối nay")).toBeInTheDocument();
    expect(screen.getByText("Tra cứu lịch đặt sân của tôi")).toBeInTheDocument();
    expect(screen.getByText("Chính sách hủy sân & bảng giá")).toBeInTheDocument();
  });

  it("opens Amazon Q style chat drawer directly when already logged in and sends suggestion prompt", async () => {
    renderApp({ userId: "customer-1", name: "Nguyễn Văn A" });

    // Click chat icon in header
    const headerAiBtn = await screen.findByTitle("Mở Trợ lý AI ĐẶT SÂN 247 (Amazon Q style)");
    fireEvent.click(headerAiBtn);

    // Chat drawer opens without asking for login
    expect(screen.queryByText(/Bạn hãy đăng nhập/i)).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Khung chat trợ lý AI")).toBeInTheDocument();
    expect(screen.getByText("Trợ lý AI ĐẶT SÂN 247")).toBeInTheDocument();

    // Click suggestion card
    const suggestionCard = screen.getByText("Tìm sân cầu lông trống tối nay");
    fireEvent.click(suggestionCard);

    // Verifies message was sent and options are rendered
    await waitFor(() => {
      expect(createConversation).toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Chào bạn, tôi tìm thấy 2 sân phù hợp tại Cầu Giấy."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sân 1 · Cầu Giấy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chọn sân" })).toBeInTheDocument();
  });
});
