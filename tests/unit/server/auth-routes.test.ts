import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockStorage, mockHashPassword, mockVerifyPassword } = vi.hoisted(
  () => ({
    mockStorage: {
      getUserByUsername: vi.fn(),
      createUser: vi.fn(),
      getUser: vi.fn(),
    },
    mockHashPassword: vi.fn(),
    mockVerifyPassword: vi.fn(),
  }),
);

vi.mock("../../../server/storage", () => ({ storage: mockStorage }));
vi.mock("../../../server/auth", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

import { registerAuthRoutes } from "../../../server/auth-routes";

type TestSession = {
  userId?: string;
  regenerate: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const routes = new Map<string, RequestHandler[]>();
const app = {
  post: vi.fn((path: string, ...handlers: RequestHandler[]) => {
    routes.set(`POST ${path}`, handlers);
  }),
  get: vi.fn((path: string, ...handlers: RequestHandler[]) => {
    routes.set(`GET ${path}`, handlers);
  }),
} as unknown as Express;

function getHandler(method: "GET" | "POST", path: string): RequestHandler {
  const handlers = routes.get(`${method} ${path}`);
  if (!handlers?.length) {
    throw new Error(`Route not registered: ${method} ${path}`);
  }
  return handlers.at(-1)!;
}

function getNextError(next: NextFunction): unknown {
  return (next as unknown as ReturnType<typeof vi.fn>).mock.calls.at(0)?.at(0);
}

function createRequest(body: unknown): {
  request: Request;
  session: TestSession;
} {
  const session: TestSession = {
    userId: "untrusted-session-user",
    regenerate: vi.fn(),
    destroy: vi.fn(),
  };

  session.regenerate.mockImplementation((callback: (error?: Error) => void) => {
    delete session.userId;
    callback();
  });

  return {
    request: { body, session } as unknown as Request,
    session,
  };
}

function createResponse(): {
  response: Response;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
} {
  const status = vi.fn();
  const json = vi.fn();
  const clearCookie = vi.fn();
  const response = { status, json, clearCookie } as unknown as Response;
  status.mockReturnValue(response);
  json.mockReturnValue(response);
  clearCookie.mockReturnValue(response);
  return { response, status, json, clearCookie };
}

describe("registerAuthRoutes", () => {
  beforeEach(() => {
    routes.clear();
    vi.clearAllMocks();
    registerAuthRoutes(app);
  });

  it("installs dedicated rate limit middleware on register and login", () => {
    expect(routes.get("POST /api/auth/register")).toHaveLength(2);
    expect(routes.get("POST /api/auth/login")).toHaveLength(2);
  });

  it("rejects registration passwords over bcrypt's 72-byte limit", async () => {
    const { request } = createRequest({
      username: "alice",
      password: "é".repeat(37),
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/register")(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(getNextError(next)).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mockStorage.getUserByUsername).not.toHaveBeenCalled();
  });

  it("rejects login passwords over bcrypt's 72-byte limit", async () => {
    const { request } = createRequest({
      username: "alice",
      password: "é".repeat(37),
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/login")(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockStorage.getUserByUsername).not.toHaveBeenCalled();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it("regenerates the session before authenticating a registered user", async () => {
    mockStorage.getUserByUsername.mockResolvedValue(undefined);
    mockHashPassword.mockResolvedValue("password-hash");
    mockStorage.createUser.mockResolvedValue({
      id: "user-1",
      username: "alice",
    });
    const { request, session } = createRequest({
      username: "alice",
      password: "correct horse battery staple",
    });
    const { response, status } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/register")(request, response, next);

    expect(session.regenerate).toHaveBeenCalledOnce();
    expect(session.userId).toBe("user-1");
    expect(status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it("regenerates the session before authenticating a logged-in user", async () => {
    mockStorage.getUserByUsername.mockResolvedValue({
      id: "user-1",
      username: "alice",
      passwordHash: "password-hash",
    });
    mockVerifyPassword.mockResolvedValue(true);
    const { request, session } = createRequest({
      username: "alice",
      password: "correct horse battery staple",
    });
    const { response, json } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/login")(request, response, next);

    expect(session.regenerate).toHaveBeenCalledOnce();
    expect(session.userId).toBe("user-1");
    expect(json).toHaveBeenCalledWith({ id: "user-1", username: "alice" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects registration when the username already exists", async () => {
    mockStorage.getUserByUsername.mockResolvedValue({
      id: "user-1",
      username: "alice",
    });
    const { request } = createRequest({
      username: "alice",
      password: "correct horse battery staple",
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/register")(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(getNextError(next)).toMatchObject({ code: "USERNAME_TAKEN" });
    expect(mockStorage.createUser).not.toHaveBeenCalled();
  });

  it("maps a concurrent username insert conflict to USERNAME_TAKEN", async () => {
    mockStorage.getUserByUsername.mockResolvedValue(undefined);
    mockHashPassword.mockResolvedValue("password-hash");
    mockStorage.createUser.mockRejectedValue({
      code: "23505",
      constraint: "users_username_unique",
    });
    const { request } = createRequest({
      username: "alice",
      password: "correct horse battery staple",
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/register")(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(getNextError(next)).toMatchObject({ code: "USERNAME_TAKEN" });
  });

  it("pays the password verification cost for an unknown username", async () => {
    mockStorage.getUserByUsername.mockResolvedValue(undefined);
    mockVerifyPassword.mockResolvedValue(false);
    const { request, session } = createRequest({
      username: "missing-user",
      password: "correct horse battery staple",
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/login")(request, response, next);

    expect(mockVerifyPassword).toHaveBeenCalledWith(
      "correct horse battery staple",
      expect.stringMatching(/^\$2b\$12\$/),
    );
    expect(next).toHaveBeenCalledOnce();
    expect(getNextError(next)).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(session.regenerate).not.toHaveBeenCalled();
    expect(session.userId).toBe("untrusted-session-user");
  });

  it("rejects an incorrect password without mutating the session", async () => {
    mockStorage.getUserByUsername.mockResolvedValue({
      id: "user-1",
      username: "alice",
      passwordHash: "password-hash",
    });
    mockVerifyPassword.mockResolvedValue(false);
    const { request, session } = createRequest({
      username: "alice",
      password: "incorrect password",
    });
    const { response } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("POST", "/api/auth/login")(request, response, next);

    expect(mockVerifyPassword).toHaveBeenCalledWith(
      "incorrect password",
      "password-hash",
    );
    expect(next).toHaveBeenCalledOnce();
    expect(getNextError(next)).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(session.regenerate).not.toHaveBeenCalled();
    expect(session.userId).toBe("untrusted-session-user");
  });

  it("destroys the session, clears the cookie, and confirms logout", () => {
    const { request, session } = createRequest(undefined);
    session.destroy.mockImplementation((callback: (error?: Error) => void) => {
      callback();
    });
    const { response, clearCookie, json } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    getHandler("POST", "/api/auth/logout")(request, response, next);

    expect(session.destroy).toHaveBeenCalledOnce();
    expect(clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(json).toHaveBeenCalledWith({ success: true });
  });

  it("returns null from /me when the session is unauthenticated", async () => {
    const { request, session } = createRequest(undefined);
    delete session.userId;
    const { response, json } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("GET", "/api/auth/me")(request, response, next);

    expect(json).toHaveBeenCalledWith(null);
    expect(mockStorage.getUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns null from /me when the session user was deleted", async () => {
    mockStorage.getUser.mockResolvedValue(undefined);
    const { request } = createRequest(undefined);
    const { response, json } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await getHandler("GET", "/api/auth/me")(request, response, next);

    expect(mockStorage.getUser).toHaveBeenCalledWith("untrusted-session-user");
    expect(json).toHaveBeenCalledWith(null);
    expect(next).not.toHaveBeenCalled();
  });
});
