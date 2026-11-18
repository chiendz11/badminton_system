import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import VerifyEmailPage from "../../src/features/identity/pages/VerifyEmailPage.jsx";
import http from "../../src/shared/api/http.js";

vi.mock("../../src/shared/api/http.js", () => ({ default: { post: vi.fn() } }));

const token = "a".repeat(43);

function Home() {
  const { state } = useLocation();
  return <p>{state?.openLogin ? "Mở đăng nhập" : "Trang chủ"}</p>;
}

function openPage(hash = "#token=" + token) {
  render(
    <MemoryRouter initialEntries={["/verify-email" + hash]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("email verification page", () => {
  it("submits a token once on confirmation and links to login after 204", async () => {
    http.post.mockResolvedValueOnce({ status: 204 });
    openPage();
    expect(http.post).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: "Xác minh email" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      "/api/auth/verify-email",
      { token },
      { timeout: 12000 },
    );

    expect(await screen.findByRole("heading", { name: "Đã xác minh email" })).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Đăng nhập" }));
    expect(await screen.findByText("Mở đăng nhập")).toBeVisible();
  });

  it("offers login when Identity rejects an expired or used token", async () => {
    http.post.mockRejectedValueOnce({ response: { status: 400 } });
    openPage();
    fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));
    expect(await screen.findByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
  });

  it("rejects malformed links without calling the API", () => {
    openPage("#token=short");
    expect(screen.getByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Xác minh email" })).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
  });

  it("requests a new link from the invalid link page", async () => {
    http.post.mockResolvedValueOnce({ status: 202 });
    openPage("#token=short");
    fireEvent.change(screen.getByLabelText("Email đăng ký"), { target: { value: "CUSTOMER@example.test" } });
    const resend = screen.getByRole("button", { name: "Gửi lại thư xác minh" });
    fireEvent.click(resend);
    fireEvent.click(resend);
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      "/api/auth/resend-verification",
      { email: "customer@example.test" },
      { timeout: 12000 },
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Nếu tài khoản đang chờ xác minh");
    expect(resend).toBeDisabled();

    const email = screen.getByLabelText("Email đăng ký");
    fireEvent.change(email, { target: { value: "another@example.test" } });
    expect(resend).toBeEnabled();
    fireEvent.change(email, { target: { value: "customer@example.test" } });
    expect(resend).toBeDisabled();
  });

  it("explains when Identity rate-limits resend", async () => {
    http.post.mockRejectedValueOnce({ response: { status: 429 } });
    openPage("#token=short");
    fireEvent.change(screen.getByLabelText("Email đăng ký"), { target: { value: "customer@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại thư xác minh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("quá nhiều yêu cầu");
    expect(screen.getByRole("button", { name: "Gửi lại thư xác minh" })).toBeEnabled();
  });

  it("allows a retry if the Gateway is unavailable", async () => {
    http.post
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({ status: 204 });
    openPage();
    fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa thể xác minh email");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Đã xác minh email" })).toBeVisible();
  });
});
