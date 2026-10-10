module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/integration/**/*.spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testTimeout: 120000,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage/integration",
};
