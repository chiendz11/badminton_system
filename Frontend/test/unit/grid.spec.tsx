import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SlotGrid } from "@badminton/booking-ui";
import type { Availability } from "@badminton/booking-contracts";
const available: Availability = {
  centerId: "11111111-1111-4111-8111-111111111111",
  date: "2030-01-08",
  courts: [
    {
      id: "22222222-2222-4222-8222-222222222221",
      name: "Sân 1",
      surface: "thảm",
      isActive: true,
      slots: [
        { minute: 600, price: 80000, available: true, state: "AVAILABLE" },
        { minute: 660, price: 80000, available: false, state: "BOOKED" },
      ],
    },
  ],
};
describe("court schedule grid", () => {
  it("selects an available hour and disables booked hours", () => {
    const onChange = vi.fn();
    render(
      <SlotGrid availability={available} selected={[]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sân 1 10:00" }));
    expect(onChange).toHaveBeenCalledWith([
      { courtId: available.courts[0].id, slots: [600] },
    ]);
    expect(screen.getByRole("button", { name: "Sân 1 11:00" })).toBeDisabled();
  });
  it("deselects a chosen hour", () => {
    const onChange = vi.fn();
    render(
      <SlotGrid
        availability={available}
        selected={[{ courtId: available.courts[0].id, slots: [600] }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sân 1 10:00" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
