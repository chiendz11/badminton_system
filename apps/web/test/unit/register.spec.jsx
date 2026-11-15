import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RegisterPage from "../../src/features/identity/pages/RegisterPage.jsx";
import ResendVerificationForm from "../../src/features/identity/ui/ResendVerificationForm.jsx";
import http from "../../src/shared/api/http.js";

vi.mock("../../src/shared/api/http.js", () => ({ default: { post: vi.fn() } }));

const email = "customer@example.test";
const password = "LocalPass1!a";

function fillForm(testPassword = password, testEmail = "CUSTOMER@example.test") {
  render(<MemoryRouter><RegisterPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: " Test Customer " } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: testEmail } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: testPassword } });
  return screen.getByRole("button", { name: "Đăng ký", exact: true });
}

describe("registration page", () => {
  it("submits once to the Gateway and asks the customer to check their email", async () => {
    http.post.mockResolvedValueOnce({
      status: 201,
      data: { userId: "new-user", role: "user", isVerified: false, verificationEmailSent: true },
    });
    const submit = fillForm();
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      "/api/auth/register",
      { email, username: "Test Customer", password },
      { timeout: 15000 },
    );
    expect(await screen.findByRole("heading", { name: "Kiểm tra hộp thư" })).toBeVisible();
    expect(screen.getByText(email)).toBeVisible();
    expect(screen.queryByLabelText("Mật khẩu")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Email đăng ký")).not.toBeInTheDocument();
    const resend = screen.getByRole("button", { name: "Gửi lại thư xác minh" });
    expect(resend).toBeDisabled();
    fireEvent.click(resend);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it("counts down from 60, unlocks, and starts again after resending", async () => {
    vi.useFakeTimers();
    try {
      render(<ResendVerificationForm email={email} />);
      const resend = screen.getByRole("button", { name: "Gửi lại thư xác minh" });
      expect(resend).toBeDisabled();
      expect(resend).toHaveAccessibleDescription("Có thể gửi lại sau 60 giây.");

      act(() => vi.advanceTimersByTime(1000));
      expect(resend).toHaveAccessibleDescription("Có thể gửi lại sau 59 giây.");
      act(() => vi.advanceTimersByTime(58_000));
      expect(resend).toHaveAccessibleDescription("Có thể gửi lại sau 1 giây.");
      expect(resend).toBeDisabled();

      act(() => vi.advanceTimersByTime(1000));
      expect(resend).toBeEnabled();
      http.post.mockResolvedValueOnce({ status: 202 });
      await act(async () => { fireEvent.click(resend); });
      expect(http.post).toHaveBeenCalledExactlyOnceWith(
        "/api/auth/resend-verification",
        { email },
        { timeout: 12000 },
      );
      expect(resend).toBeDisabled();
      expect(resend).toHaveAccessibleDescription("Có thể gửi lại sau 60 giây.");
      expect(screen.getByRole("status")).toHaveTextContent("Nếu tài khoản đang chờ xác minh");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps registration complete when delivery is unconfirmed", async () => {
    http.post.mockResolvedValueOnce({
      status: 201,
      data: { userId: "pending-user", role: "user", isVerified: false, verificationEmailSent: false },
    });
    fireEvent.click(fillForm());
    expect(await screen.findByRole("heading", { name: "Đã tạo tài khoản" })).toBeVisible();
    expect(screen.getByText(/Hệ thống chưa gửi được thư/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Đăng ký" })).not.toBeInTheDocument();
  });

  it("explains a duplicate email and leaves the form available", async () => {
    http.post.mockRejectedValueOnce({ response: { status: 409 } });
    fireEvent.click(fillForm());
    expect(await screen.findByRole("alert")).toHaveTextContent("Email này đã được đăng ký");
    expect(screen.getByRole("button", { name: "Đăng ký" })).toBeEnabled();
  });

  it.each([" CUSTOMER@example.test", "CUSTOMER@example.test ", "CUSTOMER NAME@example.test"])(
    "rejects email with whitespace (%s) before posting",
    (testEmail) => {
      fireEvent.click(fillForm(password, testEmail));
      expect(screen.getByRole("alert")).toHaveTextContent("Email không được chứa khoảng trắng");
      expect(http.post).not.toHaveBeenCalled();
    },
  );

  it("rejects passwords with whitespace before posting", () => {
    fireEvent.click(fillForm("Local pass1word!"));
    expect(screen.getByRole("alert")).toHaveTextContent("Mật khẩu không được chứa khoảng trắng");
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each(["local-password1!", "LOCAL-PASSWORD1!", "Local-password!", "LocalPassword1"])(
    "rejects passwords missing a required character category (%s)",
    (testPassword) => {
      fireEvent.click(fillForm(testPassword));
      expect(screen.getByRole("alert")).toHaveTextContent("chữ hoa, chữ thường, số và ký tự đặc biệt");
      expect(http.post).not.toHaveBeenCalled();
    },
  );

  it("counts supplementary Unicode characters once toward the minimum length", () => {
    fireEvent.click(fillForm("Aa1!" + "🙂".repeat(4)));
    expect(screen.getByRole("alert")).toHaveTextContent("ít nhất 12 ký tự");
    expect(http.post).not.toHaveBeenCalled();
  });

  it("rejects passwords beyond the UTF-8 byte limit before posting", () => {
    fireEvent.click(fillForm("Aa1!" + "é".repeat(35)));
    expect(screen.getByRole("alert")).toHaveTextContent("72 byte");
    expect(http.post).not.toHaveBeenCalled();
  });
});
