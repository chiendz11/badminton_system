import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BookingTable from "../../src/features/booking/ui/BookingTable.jsx";
describe("original admin court schedule", () => {
  it("renders the original hourly scale and existing pending/locked states", () => {
    render(
      <BookingTable
        courts={[{ courtId: "court-1", name: "Sân 1" }]}
        times={[5, 6, 7]}
        slotCount={2}
        bookingData={{
          "court-1": [{ status: "pending", userName: "Khách" }, "locked"],
        }}
      />,
    );
    expect(screen.getByText("Sân 1")).toBeInTheDocument();
    expect(screen.getByText("5:00")).toBeInTheDocument();
    expect(screen.getByTitle("Đã qua giờ")).toBeInTheDocument();
  });
});
