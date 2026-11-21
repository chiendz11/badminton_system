import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { hash } from "bcryptjs";
import { createApp } from "../src/app";
import { authRouter, type UserStore } from "../src/auth";
import {
  managementRouter,
  type DirectoryUser,
  type ManagementStore,
} from "../src/management";
import { createManagementStore } from "../src/management-store";
import type { PrismaClient } from "../generated/client";

const adminId = "ba0d0000-0000-4000-8000-000000000001";
const userId = "ba0d0000-0000-4000-8000-000000000002";
const centerId = "ba0d0000-0000-4000-8000-000000000003";
const config = {
  port: 8084,
  databaseUrl: "postgresql://localhost/test",
  jwtSecret: "test-private-secret-at-least-32-characters",
  issuer: "badminton-identity",
  audience: "badminton-system",
  secureRefreshCookie: false,
  trustProxy: 1,
  internalServiceToken: "private-internal",
  metricsToken: "private-metrics",
};
function token(id: string, role = "user", expiresIn = 900) {
  return jwt.sign({ role }, config.jwtSecret, {
    algorithm: "HS256",
    subject: id,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn,
  });
}
let account: DirectoryUser;
let store: ManagementStore;
beforeEach(() => {
  account = {
    userId,
    email: "customer@example.test",
    name: "Customer",
    phone: null,
    role: "user",
    isActive: true,
    isVerified: true,
    version: 1,
  };
  store = {
    byId: vi.fn<ManagementStore["byId"]>(async (id) => ({
      id,
      email: "actor@example.test",
      passwordHash: null,
      role: id === adminId ? "super_admin" : "user",
      isActive: true,
      profile: { name: "Actor" },
    })),
    profile: vi.fn(async () => account),
    updateProfile: vi.fn(async (_id, patch) => ({ ...account, ...patch })),
    list: vi.fn(async () => ({ users: [account], total: 1 })),
    changeUser: vi.fn(async (_actor, _id, patch) => {
      Object.assign(account, patch);
      return account;
    }),
    assign: vi.fn(async () => true),
  };
});
function app() {
  return createApp(
    async () => {},
    undefined,
    1,
    config.metricsToken,
    managementRouter(store, config),
  );
}
describe("profile and account administration", () => {
  it("uses the account role re-read while creating a session when a role change races login", async () => {
    const passwordHash = await hash("Password-for-test1!", 4);
    const currentUser = {
      id: userId,
      email: account.email,
      role: "user" as const,
      profile: { name: account.name },
    };
    const authentication: UserStore = {
      byId: store.byId,
      byEmail: async () => ({
        ...currentUser,
        role: "super_admin",
        isActive: true,
        passwordHash,
      }),
      createSession: async () => currentUser,
      rotateSession: async () => null,
      revokeSession: async () => {},
    };
    const server = createApp(
      async () => {},
      authRouter(authentication, config),
    );
    const login = await request(server)
      .post("/api/auth/login")
      .send({ email: account.email, password: "Password-for-test1!" })
      .expect(200);
    expect(jwt.decode(login.body.accessToken)).toMatchObject({ role: "user" });
    expect(login.body.profile.role).toBe("user");
  });
  it("requires a live authenticated account and ignores a stale administrator claim", async () => {
    await request(app()).get("/api/v1/me").expect(401);
    await request(app())
      .get("/api/v1/me")
      .auth(token(userId, "user", -1), { type: "bearer" })
      .expect(401);
    await request(app())
      .get("/api/v1/users")
      .auth(token(userId, "super_admin"), { type: "bearer" })
      .expect(403);
    expect(store.list).not.toHaveBeenCalled();
  });
  it.each(["role", "isActive", "isVerified", "email", "userId"])(
    "rejects %s in profile updates",
    async (field) => {
      await request(app())
        .patch("/api/v1/me")
        .auth(token(userId), { type: "bearer" })
        .send({ name: "Customer", [field]: "forged" })
        .expect(400);
      expect(store.updateProfile).not.toHaveBeenCalled();
    },
  );
  it("reads and updates only the caller profile, including clearing the phone", async () => {
    const response = await request(app())
      .get("/api/v1/me")
      .auth(token(userId), { type: "bearer" })
      .expect(200);
    expect(response.body.profile.userId).toBe(userId);
    await request(app())
      .patch("/api/v1/me")
      .auth(token(userId), { type: "bearer" })
      .send({ name: " Updated ", phone: null })
      .expect(200);
    expect(store.updateProfile).toHaveBeenCalledWith(userId, {
      name: "Updated",
      phone: null,
    });
    await request(app())
      .patch("/api/v1/me")
      .auth(token(userId), { type: "bearer" })
      .send({ phone: "invalid-phone" })
      .expect(400);
  });
  it("validates filters and pagination for administrators", async () => {
    await request(app())
      .get(
        "/api/v1/users?role=center_manager&isActive=true&search=Alice&offset=20&limit=20",
      )
      .auth(token(adminId), { type: "bearer" })
      .expect(200);
    expect(store.list).toHaveBeenCalledWith({
      role: "center_manager",
      isActive: true,
      search: "Alice",
      offset: 20,
      limit: 20,
    });
    for (const query of [
      "limit=0",
      "limit=101",
      "role=owner",
      "isActive=yes",
      "offset=-1",
      "role=user&role=super_admin",
    ]) {
      await request(app())
        .get("/api/v1/users?" + query)
        .auth(token(adminId), { type: "bearer" })
        .expect(400);
    }
  });
  it("requires audit reasons, blocks self role changes and returns 404 for missing users", async () => {
    await request(app())
      .put(`/api/v1/users/${adminId}/role`)
      .auth(token(adminId), { type: "bearer" })
      .send({ role: "user", reason: "self" })
      .expect(403);
    await request(app())
      .put(`/api/v1/users/${userId}/role`)
      .auth(token(adminId), { type: "bearer" })
      .send({ role: "center_manager" })
      .expect(400);
    await request(app())
      .put(`/api/v1/users/${userId}/role`)
      .auth(token(adminId), { type: "bearer" })
      .send({ role: "center_manager", reason: "Approved" })
      .expect(200);
    expect(store.changeUser).toHaveBeenCalledWith(
      adminId,
      userId,
      { role: "center_manager" },
      "Approved",
      undefined,
    );
    vi.mocked(store.changeUser).mockResolvedValueOnce(null);
    await request(app())
      .patch(`/api/v1/users/${userId}/status`)
      .auth(token(adminId), { type: "bearer" })
      .send({ isActive: false, reason: "Violation" })
      .expect(404);
  });
  it("validates assignments and rejects a missing or unsuitable manager", async () => {
    await request(app())
      .put("/api/v1/center-assignments")
      .auth(token(userId), { type: "bearer" })
      .send({ userId, centerId, active: true })
      .expect(403);
    await request(app())
      .put("/api/v1/center-assignments")
      .auth(token(adminId), { type: "bearer" })
      .send({ userId, centerId, active: true, role: "super_admin" })
      .expect(400);
    vi.mocked(store.assign).mockResolvedValueOnce(false);
    await request(app())
      .put("/api/v1/center-assignments")
      .auth(token(adminId), { type: "bearer" })
      .send({ userId, centerId, active: true })
      .expect(409);
    await request(app())
      .put("/api/v1/center-assignments")
      .auth(token(adminId), { type: "bearer" })
      .send({ userId, centerId, active: true })
      .expect(200);
  });
  it("accepts service credentials and rejects user JWTs on internal lookups", async () => {
    const path = `/internal/identity/users/${userId}`;
    await request(app())
      .get(path)
      .auth(token(adminId), { type: "bearer" })
      .expect(401);
    const response = await request(app())
      .get(path)
      .set("x-internal-token", config.internalServiceToken)
      .expect(200);
    expect(response.body).toEqual({
      userId,
      role: "user",
      isActive: true,
      version: 1,
    });
    expect(response.body.email).toBeUndefined();
    await request(app())
      .get(path)
      .auth(config.internalServiceToken, { type: "bearer" })
      .expect(200);
  });
  it("keeps liveness available and protects Prometheus metrics", async () => {
    await request(app()).get("/health/live").expect(200, { status: "live" });
    await request(app()).get("/metrics").expect(401);
    await request(app())
      .get("/metrics")
      .auth("wrong", { type: "bearer" })
      .expect(401);
    const response = await request(app())
      .get("/metrics")
      .auth(config.metricsToken, { type: "bearer" })
      .expect(200);
    expect(response.text).toContain("identity_http_requests_total");
    expect(response.text).toContain("identity_http_duration_seconds");
  });
  it("rejects the old refresh cookie after an administrator locks the account", async () => {
    const passwordHash = await hash("Password-for-test1!", 4);
    let revoked = false;
    const authentication: UserStore = {
      byId: store.byId,
      byEmail: async () => ({
        id: userId,
        email: account.email,
        passwordHash,
        role: "user",
        isActive: account.isActive,
        profile: { name: account.name },
      }),
      createSession: vi.fn(async () => {}),
      rotateSession: async () =>
        !revoked && account.isActive
          ? {
              user: {
                id: userId,
                email: account.email,
                role: "user",
                profile: { name: account.name },
              },
              expiresAt: new Date(Date.now() + 600000),
            }
          : null,
      revokeSession: vi.fn(async () => {}),
    };
    store.changeUser = async (_actor, _id, patch) => {
      Object.assign(account, patch);
      revoked = true;
      return account;
    };
    const server = createApp(
      async () => {},
      authRouter(authentication, config),
      1,
      config.metricsToken,
      managementRouter(store, config),
    );
    const login = await request(server)
      .post("/api/auth/login")
      .send({ email: account.email, password: "Password-for-test1!" })
      .expect(200);
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    await request(server)
      .patch(`/api/v1/users/${userId}/status`)
      .auth(token(adminId), { type: "bearer" })
      .send({ isActive: false, reason: "Violation" })
      .expect(200);
    await request(server)
      .post("/api/auth/refresh")
      .set("Cookie", cookie)
      .expect(401);
  });
});

describe("transactional user changes", () => {
  it("records the audit and outbox with all unexpired sessions revoked in the same transaction", async () => {
    const updated = {
      id: userId,
      email: account.email,
      role: "user",
      isActive: false,
      isVerified: true,
      version: 2,
      profile: { name: account.name, phone: null },
    };
    const tx = {
      $queryRaw: vi.fn(async () => [{ id: userId }]),
      user: {
        findUniqueOrThrow: vi.fn(async () => ({
          ...updated,
          isActive: true,
          version: 1,
        })),
        update: vi.fn(async () => updated),
      },
      session: { updateMany: vi.fn(async () => ({ count: 2 })) },
      centerAssignment: { updateMany: vi.fn(async () => ({ count: 1 })) },
      identityAudit: { create: vi.fn(async () => ({})) },
      identityOutbox: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      $transaction: vi.fn(async (run) => run(tx)),
    } as unknown as PrismaClient;
    await createManagementStore(prisma).changeUser(
      adminId,
      userId,
      { isActive: false },
      "Violation",
      "trace-1",
    );
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { userId, revokedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.identityAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: adminId,
        userId,
        reason: "Violation",
        action: "status",
      }),
    });
    expect(tx.identityOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        version: 2,
        event: expect.objectContaining({
          type: "identity.user-updated.v1",
          correlationId: "trace-1",
          payload: { userId, role: "user", isActive: false, version: 2 },
        }),
      }),
    });
    tx.identityOutbox.create.mockRejectedValueOnce(Error("outbox unavailable"));
    await expect(
      createManagementStore(prisma).changeUser(
        adminId,
        userId,
        { role: "center_manager" },
        "Approved",
      ),
    ).rejects.toThrow("outbox unavailable");
  });
});
