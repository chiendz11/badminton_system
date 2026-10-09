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
  it("keeps the original brand and booking/AI destinations only", () => {
    header(null);
    expect(
      screen.getByText("247", { exact: false, selector: "a.logo" }),
    ).toBeInTheDocument();
    for (const name of ["Trang Chủ", "Đặt Sân", "Trợ lý đặt sân"])
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    expect(screen.queryByText(/Đăng Nhập|Pass Sân/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Tin Tức|Chính Sách|Liên Hệ/i),
    ).not.toBeInTheDocument();
  });
  it("accepts a profile supplied by the host without implementing a login flow", () => {
    header({ profile: { userId: "customer-1", name: "Khách hàng" } });
    expect(screen.getByText("Khách hàng")).toBeInTheDocument();
    expect(document.querySelector('a[href="/notifications"]')).toBeNull();
  });
});
