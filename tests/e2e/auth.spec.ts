import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should register a new user", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        username: `testuser_${Date.now()}`,
        password: "TestPassword123!",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("username");
    expect(body.username).toMatch(/^testuser_/);
  });

  test("should reject duplicate username on register", async ({ request }) => {
    const username = `dupuser_${Date.now()}`;

    const first = await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });
    expect(first.ok()).toBeTruthy();

    const second = await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });
    expect(second.ok()).toBeFalsy();
    expect(second.status()).toBe(400);
  });

  test("should reject registration with short password", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        username: `shortpass_${Date.now()}`,
        password: "short",
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test("should login with valid credentials", async ({ request }) => {
    const username = `loginuser_${Date.now()}`;

    await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });

    const response = await request.post("/api/auth/login", {
      data: { username, password: "TestPassword123!" },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.username).toBe(username);
  });

  test("should reject login with wrong password", async ({ request }) => {
    const username = `wrongpass_${Date.now()}`;

    await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });

    const response = await request.post("/api/auth/login", {
      data: { username, password: "WrongPassword!" },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test("should return null for /me when not authenticated", async ({ request }) => {
    const response = await request.get("/api/auth/me");

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeNull();
  });

  test("should return user info for /me when authenticated", async ({ request }) => {
    const username = `meuser_${Date.now()}`;

    await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });

    const meResponse = await request.get("/api/auth/me");

    expect(meResponse.ok()).toBeTruthy();
    const meBody = await meResponse.json();
    expect(meBody).toHaveProperty("id");
    expect(meBody.username).toBe(username);
  });

  test("should logout successfully", async ({ request }) => {
    const username = `logoutuser_${Date.now()}`;

    await request.post("/api/auth/register", {
      data: { username, password: "TestPassword123!" },
    });

    const logoutResponse = await request.post("/api/auth/logout");
    expect(logoutResponse.ok()).toBeTruthy();
    const logoutBody = await logoutResponse.json();
    expect(logoutBody.success).toBe(true);
  });
});
