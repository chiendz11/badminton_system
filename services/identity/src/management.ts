import { Router } from "express";
import type { IdentityConfig } from "./config/environment";
import { requireUser, tokenMatches, uuidPattern } from "./access";
import type { AuthUser } from "./auth";

export type UserRole = AuthUser["role"];
export interface DirectoryUser {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  version: number;
}
export interface UserFilter {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  offset: number;
  limit: number;
}
export interface ManagementStore {
  byId(id: string): Promise<AuthUser | null>;
  profile(id: string): Promise<DirectoryUser | null>;
  updateProfile(
    id: string,
    patch: { name?: string; phone?: string | null },
  ): Promise<DirectoryUser>;
  list(filter: UserFilter): Promise<{ users: DirectoryUser[]; total: number }>;
  changeUser(
    actorId: string,
    userId: string,
    patch: { role?: UserRole; isActive?: boolean },
    reason: string,
    correlationId?: string,
  ): Promise<DirectoryUser | null>;
  assign(
    actorId: string,
    assignment: { userId: string; centerId: string; active: boolean },
  ): Promise<boolean>;
}

const roles = ["user", "center_manager", "super_admin"];
function validBody(body: unknown, allowed: string[]) {
  return (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.keys(body).length > 0 &&
    Object.keys(body).every((key) => allowed.includes(key))
  );
}
function validReason(reason: unknown): reason is string {
  return (
    typeof reason === "string" &&
    reason.trim().length > 0 &&
    reason.length <= 1000
  );
}

export function managementRouter(
  store: ManagementStore,
  config: IdentityConfig,
) {
  const router = Router();
  const userAccess = requireUser(config, store.byId);
  const adminAccess = requireUser(config, store.byId, true);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/api/v1/me", userAccess, async (_req, res) => {
    res.json({ profile: await store.profile(res.locals.actor.id) });
  });
  router.patch("/api/v1/me", userAccess, async (req, res) => {
    const body = req.body;
    if (
      !validBody(body, ["name", "phone"]) ||
      (body.name !== undefined &&
        (typeof body.name !== "string" ||
          !body.name.trim() ||
          body.name.trim().length > 150)) ||
      (body.phone !== undefined &&
        body.phone !== null &&
        (typeof body.phone !== "string" ||
          body.phone.length > 32 ||
          !/^\+?[0-9 ()-]{3,32}$/.test(body.phone)))
    ) {
      res
        .status(400)
        .json({ message: "Chỉ được cập nhật họ tên và số điện thoại hợp lệ" });
      return;
    }
    res.json({
      profile: await store.updateProfile(res.locals.actor.id, {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
      }),
    });
  });
  router.get("/api/v1/users", adminAccess, async (req, res) => {
    const { role, isActive, search, offset = "0", limit = "20" } = req.query;
    if (
      Object.keys(req.query).some(
        (key) =>
          !["role", "isActive", "search", "offset", "limit"].includes(key),
      ) ||
      (role !== undefined &&
        (typeof role !== "string" || !roles.includes(role))) ||
      (isActive !== undefined && isActive !== "true" && isActive !== "false") ||
      (search !== undefined &&
        (typeof search !== "string" || search.length > 150)) ||
      typeof offset !== "string" ||
      !/^\d{1,7}$/.test(offset) ||
      typeof limit !== "string" ||
      !/^\d{1,3}$/.test(limit) ||
      Number(limit) < 1 ||
      Number(limit) > 100
    ) {
      res.status(400).json({ message: "Bộ lọc không hợp lệ" });
      return;
    }
    res.json(
      await store.list({
        role: role as UserRole | undefined,
        isActive: isActive === undefined ? undefined : isActive === "true",
        search: search as string | undefined,
        offset: Number(offset),
        limit: Number(limit),
      }),
    );
  });
  router.patch(
    "/api/v1/users/:userId/status",
    adminAccess,
    async (req, res) => {
      if (
        typeof req.params.userId !== "string" ||
        !uuidPattern.test(req.params.userId) ||
        !validBody(req.body, ["isActive", "reason"]) ||
        typeof req.body.isActive !== "boolean" ||
        !validReason(req.body.reason)
      ) {
        res.status(400).json({ message: "Trạng thái và lý do không hợp lệ" });
        return;
      }
      const user = await store.changeUser(
        res.locals.actor.id,
        req.params.userId,
        { isActive: req.body.isActive },
        req.body.reason.trim(),
        req.get("x-request-id"),
      );
      if (!user) {
        res.status(404).json({ message: "Không tìm thấy tài khoản" });
        return;
      }
      res.json(user);
    },
  );
  router.put("/api/v1/users/:userId/role", adminAccess, async (req, res) => {
    if (
      typeof req.params.userId !== "string" ||
      !uuidPattern.test(req.params.userId) ||
      !validBody(req.body, ["role", "reason"]) ||
      !roles.includes(req.body.role) ||
      !validReason(req.body.reason)
    ) {
      res.status(400).json({ message: "Vai trò và lý do không hợp lệ" });
      return;
    }
    if (req.params.userId === res.locals.actor.id) {
      res.status(403).json({ message: "Không thể tự thay đổi vai trò" });
      return;
    }
    const user = await store.changeUser(
      res.locals.actor.id,
      req.params.userId,
      { role: req.body.role },
      req.body.reason.trim(),
      req.get("x-request-id"),
    );
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy tài khoản" });
      return;
    }
    res.json(user);
  });
  router.put("/api/v1/center-assignments", adminAccess, async (req, res) => {
    const body = req.body;
    if (
      !validBody(body, ["userId", "centerId", "active"]) ||
      typeof body.userId !== "string" ||
      !uuidPattern.test(body.userId) ||
      typeof body.centerId !== "string" ||
      !uuidPattern.test(body.centerId) ||
      typeof body.active !== "boolean"
    ) {
      res.status(400).json({ message: "Thông tin phân công không hợp lệ" });
      return;
    }
    if (!(await store.assign(res.locals.actor.id, body))) {
      res.status(409).json({
        message: "Tài khoản phải đang hoạt động và có vai trò center_manager",
      });
      return;
    }
    res.json(body);
  });
  router.get("/internal/identity/users/:userId", async (req, res) => {
    const bearer = req.get("authorization");
    const token =
      req.get("x-internal-token") ??
      (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
    if (!tokenMatches(token, config.internalServiceToken)) {
      res.status(401).json({ message: "Cần service credential" });
      return;
    }
    if (!uuidPattern.test(req.params.userId)) {
      res.status(400).json({ message: "User ID không hợp lệ" });
      return;
    }
    const user = await store.profile(req.params.userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy tài khoản" });
      return;
    }
    // Internal consumers need account state, not credentials or contact details.
    res.json({
      userId: user.userId,
      role: user.role,
      isActive: user.isActive,
      version: user.version,
    });
  });
  return router;
}
