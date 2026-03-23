import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/schema.integration.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          rootDir: ".",
          module: "commonjs",
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};

export default config;
