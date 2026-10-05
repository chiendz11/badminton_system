module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testTimeout: 15000,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage/unit",
};
