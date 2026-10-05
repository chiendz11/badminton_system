import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Header from "../../src/shared/ui/Header.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
function header(session) {
  render(
    <MemoryRouter>
      <SessionProvider session={session}>
        <Header />
      </SessionProvider>
    </MemoryRouter>,
  );
}
describe("upstream customer navigation without excluded flows", () => {
  it("keeps the original brand and public destinations, with no login or resale controls", () => {
    header(null);
    expect(
      screen.getByText("247", { exact: false, selector: "a.logo" }),
    ).toBeInTheDocument();
    for (const name of [
      "Trang Chủ",
      "Đặt Sân",
      "Tin Tức",
      "Chính Sách",
      "Liên Hệ",
    ])
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    expect(screen.queryByText(/Đăng Nhập|Pass Sân/i)).not.toBeInTheDocument();
  });
  it("accepts a profile supplied by the host without implementing a login flow", () => {
    header({ profile: { userId: "customer-1", name: "Khách hàng" } });
    expect(screen.getByText("Khách hàng")).toBeInTheDocument();
    expect(
      document.querySelector('a[href="/notifications"]'),
    ).toBeInTheDocument();
  });
});
