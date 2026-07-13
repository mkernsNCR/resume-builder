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
  return handlers[handlers.length - 1];
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
} {
  const status = vi.fn();
  const json = vi.fn();
  const response = { status, json } as unknown as Response;
  status.mockReturnValue(response);
  json.mockReturnValue(response);
  return { response, status, json };
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
    expect(
      (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toMatchObject({
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
});
