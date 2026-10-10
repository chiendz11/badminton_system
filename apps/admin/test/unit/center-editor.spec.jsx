import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CenterModal from "../../src/features/centers/ui/CenterModal.jsx";
import { SessionProvider } from "../../src/shared/session/SessionContext.jsx";
import { updateCenterGQL } from "../../src/features/centers/api/center_service/graphql/center.api.js";
vi.mock(
  "../../src/features/centers/api/center_service/graphql/center.api.js",
  () => ({ createCenterGQL: vi.fn(), updateCenterGQL: vi.fn() }),
);
describe("original centre editor scoped to Booking Core", () => {
  it("saves centre/court/pricing data without uploading or clearing existing media", async () => {
    updateCenterGQL.mockResolvedValue({ centerId: "center-1" });
    const onSave = vi.fn(),
      onClose = vi.fn();
    const center = {
      centerId: "center-1",
      name: "Trung tâm gốc",
      address: "Cầu Giấy",
      phone: "0901234567",
      totalCourts: 4,
      centerManagerId: "manager",
      logoFileId: "existing-logo",
      imageFileIds: ["existing-image"],
      facilities: ["WC"],
      pricing: { weekday: [], weekend: [] },
    };
    const { container } = render(
      <SessionProvider
        session={{ profile: { userId: "admin", role: "super_admin" } }}
      >
        <CenterModal
          center={center}
          isOpen
          onSave={onSave}
          onClose={onClose}
          isCreating={false}
          centerManagers={[]}
          allCenters={[center]}
        />
      </SessionProvider>,
    );
    expect(container.querySelector('input[type="file"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu Lại" }));
    await waitFor(() => expect(updateCenterGQL).toHaveBeenCalledTimes(1));
    const [id, payload] = updateCenterGQL.mock.calls[0];
    expect(id).toBe("center-1");
    expect(payload).toMatchObject({
      name: "Trung tâm gốc",
      totalCourts: 4,
      facilities: ["WC"],
    });
    expect(payload).not.toHaveProperty("logoFileId");
    expect(payload).not.toHaveProperty("imageFileIds");
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});
