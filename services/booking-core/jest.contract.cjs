module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/contract/**/*.spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testTimeout: 15000,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage/contract",
};
