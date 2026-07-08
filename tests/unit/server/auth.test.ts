import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcrypt";

vi.mock("../../../server/storage", () => ({
  storage: { getUser: vi.fn(), getUserByUsername: vi.fn(), createUser: vi.fn() },
}));

vi.mock("../../../server/env", () => ({
  env: { DATABASE_URL: "postgresql://localhost:5432/test_db", PORT: 5000, NODE_ENV: "test" },
}));

vi.mock("pg", () => ({
  Pool: class MockPool {
    query = vi.fn();
    end = vi.fn();
  },
}));

vi.mock("connect-pg-simple", () => ({
  default: vi.fn(() => class MockSessionStore {
    get = vi.fn();
    set = vi.fn();
    destroy = vi.fn();
    touch = vi.fn();
  }),
}));

vi.mock("express-session", () => ({
  default: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
}));

const { hashPassword, verifyPassword } = await import("../../../server/auth");

describe("auth utilities", () => {
  describe("hashPassword", () => {
    it("returns a bcrypt hash that is different from the plaintext", async () => {
      const hash = await hashPassword("mySecretPassword");
      expect(hash).not.toBe("mySecretPassword");
      expect(hash.startsWith("$2")).toBe(true);
    });

    it("produces different hashes for the same password (salt)", async () => {
      const hash1 = await hashPassword("samePassword");
      const hash2 = await hashPassword("samePassword");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for a correct password", async () => {
      const hash = await bcrypt.hash("correctPassword", 10);
      const result = await verifyPassword("correctPassword", hash);
      expect(result).toBe(true);
    });

    it("returns false for an incorrect password", async () => {
      const hash = await bcrypt.hash("correctPassword", 10);
      const result = await verifyPassword("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("returns false for empty password", async () => {
      const hash = await bcrypt.hash("correctPassword", 10);
      const result = await verifyPassword("", hash);
      expect(result).toBe(false);
    });
  });
});
