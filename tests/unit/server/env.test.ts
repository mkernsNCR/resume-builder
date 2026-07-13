import { describe, it, expect } from "vitest";
import { envSchema } from "../../../server/env";

describe("envSchema", () => {
  it("parses valid environment variables", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      PORT: "3000",
      NODE_ENV: "production",
      SESSION_SECRET: "a-secure-session-secret-with-32-characters",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(
        "postgresql://user:pass@localhost:5432/db",
      );
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe("production");
    }
  });

  it("applies defaults for PORT and NODE_ENV", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      SESSION_SECRET: "a-secure-session-secret-with-32-characters",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(5000);
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("coerces PORT string to number", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      PORT: "8080",
      SESSION_SECRET: "a-secure-session-secret-with-32-characters",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
      expect(typeof result.data.PORT).toBe("number");
    }
  });

  it("fails when DATABASE_URL is missing", () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path[0] === "DATABASE_URL")).toBe(true);
    }
  });

  it("fails when DATABASE_URL is not a valid URL", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "not-a-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path[0] === "DATABASE_URL")).toBe(true);
    }
  });

  it("fails when NODE_ENV is not a valid enum value", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      NODE_ENV: "staging",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path[0] === "NODE_ENV")).toBe(true);
    }
  });

  it("fails when PORT is not a positive integer", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      PORT: "-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path[0] === "PORT")).toBe(true);
    }
  });

  it("requires a strong session secret outside tests", () => {
    const missing = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      NODE_ENV: "production",
    });
    const tooShort = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      NODE_ENV: "production",
      SESSION_SECRET: "too-short",
    });

    expect(missing.success).toBe(false);
    expect(tooShort.success).toBe(false);
  });

  it("allows tests to use the built-in test session secret", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/db",
      NODE_ENV: "test",
    });

    expect(result.success).toBe(true);
  });
});
