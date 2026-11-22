ALTER TABLE "User" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "CenterAssignment" (
  "centerId" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedBy" UUID NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CenterAssignment_userId_active_idx" ON "CenterAssignment"("userId", "active");
CREATE TABLE "IdentityAudit" (
  "id" UUID PRIMARY KEY,
  "actorId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IdentityAudit_userId_createdAt_idx" ON "IdentityAudit"("userId", "createdAt");
CREATE TABLE "IdentityOutbox" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "event" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "IdentityOutbox_userId_version_key" ON "IdentityOutbox"("userId", "version");
CREATE INDEX "IdentityOutbox_publishedAt_createdAt_idx" ON "IdentityOutbox"("publishedAt", "createdAt");
