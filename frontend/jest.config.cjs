module.exports = {
  testEnvironment: "jsdom",

  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],

  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],

  transform: {
    "^.+\\.[tj]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
            hidden: {
              jest: true,
            },
          },
          target: "es2022",
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
};
