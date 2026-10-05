import type { Request } from "express";
import { BookingCoreClient } from "../../clients/booking-core.client";
import { GatewayError } from "../../middleware/http-errors";
import { centerView, id, pricingBands } from "../booking/legacy-mappers";
export class CenterAdapter {
  constructor(private readonly core: BookingCoreClient) {}
  async centers(req: Request) {
    const items: any[] = [];
    let page = 1;
    let total;
    do {
      const result = await this.core.call(
        req,
        `/api/v1/centers?limit=100&page=${page}${req.actor && req.actor.role !== "user" ? "&managed=true" : ""}`,
      );
      items.push(...result.items);
      total = result.total;
      page++;
    } while (items.length < total);
    return items.map(centerView);
  }
  async center(req: Request, value: string) {
    return centerView(
      await this.core.call(req, "/api/v1/centers/" + id(value)),
    );
  }
  requireManager(req: Request) {
    if (!req.actor) throw new GatewayError(401, "Cần bearer token");
    if (req.actor.role === "user")
      throw new GatewayError(403, "Cần quyền quản lý");
  }
  async create(req: Request, data: any) {
    this.requireManager(req);
    const fields = this.fields(data, true);
    if (!fields.managerId) fields.managerId = req.actor!.userId;
    return centerView(
      await this.core.call(req, "/api/v1/centers", "POST", fields),
    );
  }
  async update(req: Request, centerId: string, data: any) {
    this.requireManager(req);
    return centerView(
      await this.core.call(
        req,
        "/api/v1/centers/" + id(centerId),
        "PATCH",
        this.fields(data, false),
      ),
    );
  }
  async remove(req: Request, centerId: string) {
    this.requireManager(req);
    await this.core.call(req, "/api/v1/centers/" + id(centerId), "PATCH", {
      isActive: false,
    });
    return true;
  }
  private fields(data: any, create: boolean) {
    const fields: any = {};
    for (const key of [
      "name",
      "address",
      "phone",
      "description",
      "facilities",
      "googleMapUrl",
      "totalCourts",
      "isActive",
      "logoFileId",
      "imageFileIds",
    ])
      if (data[key] !== undefined && data[key] !== null)
        fields[key] = data[key];
    if (data.centerManagerId) fields.managerId = data.centerManagerId;
    if (data.pricing) {
      const bands = pricingBands(data.pricing);
      if (!create || bands.length) fields.pricingBands = bands;
    }
    if (!fields.googleMapUrl) delete fields.googleMapUrl;
    if (!create && data.googleMapUrl !== undefined && !data.googleMapUrl)
      fields.googleMapUrl = null;
    if (!create && data.logoFileId === null) fields.logoFileId = null;
    return fields;
  }
}
