import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";

const TEST_PASSWORD = "TestPassword123!";

function uniqueUsername(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

async function registerUser(
  request: APIRequestContext,
  username: string,
): Promise<void> {
  const response = await request.post("/api/auth/register", {
    data: { username, password: TEST_PASSWORD },
  });
  expect(response.status()).toBe(201);
}

async function logout(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/auth/logout");
  expect(response.status()).toBe(200);
}

test.describe("Authentication", () => {
  test("should register a new user", async ({ request }) => {
    const username = uniqueUsername("testuser");
    const response = await request.post("/api/auth/register", {
      data: {
        username,
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body.username).toBe(username);
  });

  test("should reject duplicate username on register", async ({ request }) => {
    const username = uniqueUsername("dupuser");

    await registerUser(request, username);

    const second = await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });
    expect(second.status()).toBe(400);
    await expect(second.json()).resolves.toMatchObject({
      code: "USERNAME_TAKEN",
    });
  });

  test("should reject registration with short password", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        username: uniqueUsername("shortpass"),
        password: "short",
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  test("should login with valid credentials", async ({ request }) => {
    const username = uniqueUsername("loginuser");

    await registerUser(request, username);
    await logout(request);

    const response = await request.post("/api/auth/login", {
      data: { username, password: TEST_PASSWORD },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.username).toBe(username);
  });

  test("should reject login with wrong password", async ({ request }) => {
    const username = uniqueUsername("wrongpass");

    await registerUser(request, username);
    await logout(request);

    const response = await request.post("/api/auth/login", {
      data: { username, password: "WrongPassword!" },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });

    const meResponse = await request.get("/api/auth/me");
    await expect(meResponse.json()).resolves.toBeNull();
  });

  test("should return null for /me when not authenticated", async ({ request }) => {
    const response = await request.get("/api/auth/me");

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeNull();
  });

  test("should return user info for /me when authenticated", async ({ request }) => {
    const username = uniqueUsername("meuser");

    await registerUser(request, username);

    const meResponse = await request.get("/api/auth/me");

    expect(meResponse.status()).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody).toHaveProperty("id");
    expect(meBody.username).toBe(username);
  });

  test("should logout successfully", async ({ request }) => {
    const username = uniqueUsername("logoutuser");

    await registerUser(request, username);

    const logoutResponse = await request.post("/api/auth/logout");
    expect(logoutResponse.status()).toBe(200);
    const logoutBody = await logoutResponse.json();
    expect(logoutBody.success).toBe(true);

    const meResponse = await request.get("/api/auth/me");
    await expect(meResponse.json()).resolves.toBeNull();
  });
});
