import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ROLES } from "@badminton/auth-contracts";

const ROOT = path.resolve(__dirname, "../../..");
const OPENAPI_PATH = path.join(ROOT, "contracts/identity/openapi.json");
const EXAMPLES_PATH = path.join(
  ROOT,
  "contracts/identity/openapi.examples.json",
);

describe("Identity Service Contract Tests", () => {
  it("conforms to published OpenAPI 3.1 contract specification", () => {
    expect(existsSync(OPENAPI_PATH)).toBe(true);
    const spec = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toContain("Identity");

    // Must declare standard endpoints
    expect(spec.paths["/login"]).toBeDefined();
    expect(spec.paths["/me"]).toBeDefined();
  });

  it("validates positive and negative examples against LoginRequest schema", () => {
    const spec = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
    const examples = JSON.parse(readFileSync(EXAMPLES_PATH, "utf8"));

    const loginSchema = spec.components?.schemas?.LoginRequest;
    expect(loginSchema).toBeDefined();

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(loginSchema);

    for (const valid of examples.valid) {
      if (valid.schema === "LoginRequest") {
        const isValid = validate(valid.value);
        expect(isValid).toBe(true);
      }
    }

    for (const invalid of examples.invalid) {
      if (invalid.schema === "LoginRequest") {
        const isValid = validate(invalid.value);
        expect(isValid).toBe(false);
      }
    }
  });

  it("aligns internal roles with shared @badminton/auth-contracts ROLES", () => {
    expect(ROLES).toContain("user");
    expect(ROLES).toContain("center_manager");
    expect(ROLES).toContain("super_admin");

    const spec = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
    const contractRoles = spec.components?.schemas?.Actor?.properties?.role?.enum;
    expect(contractRoles).toBeDefined();
    for (const role of ROLES) {
      expect(contractRoles).toContain(role);
    }
  });
});
