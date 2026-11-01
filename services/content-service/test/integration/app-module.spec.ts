import { describe, it, expect } from "vitest";
import { AppModule } from "../../src/app.module";

describe("Content Service Module Integration", () => {
  it("defines AppModule with Controllers and Providers metadata", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) || [];
    expect(controllers.length).toBeGreaterThan(0);

    const imports = Reflect.getMetadata("imports", AppModule) || [];
    expect(imports.length).toBeGreaterThan(0);
  });
});
