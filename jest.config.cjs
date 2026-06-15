module.exports = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "jsdom",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    testMatch: ["**/tests/**/*.test.ts"],
    collectCoverageFrom: ["src/**/*.ts"],
    clearMocks: true
};
