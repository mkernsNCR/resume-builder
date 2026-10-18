import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { Pool } from "pg";
import { testDatabaseUrl } from "./test-database";

// These cases inspect the shared upload directory; keep their file writes ordered.
test.describe.configure({ mode: "default" });

const password = "TestPassword123!";
const userIds: string[] = [];
async function register(request: APIRequestContext) {
  const username = `secure_${randomUUID()}`;
  const response = await request.post("/api/auth/register", {
    data: { username, password },
  });
  expect(response.status()).toBe(201);
  const user = await response.json();
  userIds.push(user.id);
  return { ...user, username };
}
async function signIn(page: Page, username: string) {
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTestId("auth-form")).toHaveCount(0);
  await expect(page.getByTestId("button-save")).toBeVisible();
}

test.afterEach(async () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  try {
    await pool.query(
      "DELETE FROM user_sessions WHERE sess ->> 'userId' = ANY($1::text[])",
      [userIds],
    );
    await pool.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
      userIds,
    ]);
  } finally {
    userIds.length = 0;
    await pool.end();
  }
});

test("anonymous resume operations and upload are denied before disk writes", async ({
  request,
}) => {
  const before = await readdir("uploads");
  const routes = [
    ["GET", "/api/resumes"],
    ["POST", "/api/resumes"],
    ["GET", "/api/resumes/test"],
    ["PUT", "/api/resumes/test"],
    ["DELETE", "/api/resumes/test"],
    ["POST", "/api/resumes/test/duplicate"],
    ["POST", "/api/resumes/test/score"],
    ["POST", "/api/resumes/test/match"],
    ["POST", "/api/resumes/test/suggestions"],
    ["POST", "/api/resumes/pdf"],
    ["GET", "/api/resumes/test/pdf"],
  ];
  for (const [method, url] of routes) {
    const response = await request.fetch(url, { method });
    expect(response.status(), `${method} ${url}`).toBe(401);
    expect((await response.json()).code).toBe("AUTH_REQUIRED");
  }
  const upload = await request.post("/api/upload", {
    multipart: {
      file: {
        name: "resume.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF invalid"),
      },
    },
  });
  expect(upload.status()).toBe(401);
  expect(await readdir("uploads")).toEqual(before);
});

test("two users cannot read, alter, analyze, export or collide with each other's resumes", async ({
  playwright,
  baseURL,
}) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  try {
    const owner = await register(a);
    const other = await register(b);
    const id = randomUUID();
    const created = await a.post("/api/resumes", {
      data: {
        id,
        ownerId: other.id,
        title: "Private A",
        template: "classic",
        content: { fullName: "Private A" },
      },
    });
    expect(created.status()).toBe(201);
    expect((await created.json()).ownerId).toBe(owner.id);
    expect(await (await b.get("/api/resumes")).json()).toEqual([]);
    for (const [method, suffix] of [
      ["GET", ""],
      ["PUT", ""],
      ["DELETE", ""],
      ["GET", "/pdf"],
      ["POST", "/duplicate"],
      ["POST", "/score"],
      ["POST", "/match"],
      ["POST", "/suggestions"],
    ]) {
      const response = await b.fetch(`/api/resumes/${id}${suffix}`, {
        method,
        data: { title: "Attack", jobDescription: "Engineer" },
      });
      expect(response.status(), `${method} ${suffix}`).toBe(404);
    }
    const collision = await b.post("/api/resumes", {
      data: {
        id,
        ownerId: owner.id,
        title: "Attack",
        content: { fullName: "Attack" },
      },
    });
    expect(collision.status()).toBe(409);
    const original = await (await a.get(`/api/resumes/${id}`)).json();
    expect(original.title).toBe("Private A");
    const retry = await a.post("/api/resumes", {
      data: { id, title: "Retry", content: { fullName: "Retry" } },
    });
    expect(retry.status()).toBe(201);
    const retried = await retry.json();
    expect(retried.createdAt).toBe(original.createdAt);
    expect(retried.template).toBe("classic");
    expect(
      (await (await a.get("/api/resumes")).json()).filter(
        (row: { id: string }) => row.id === id,
      ),
    ).toHaveLength(1);
    const mismatch = await b.get("/api/resumes", {
      headers: { "X-Expected-User-Id": owner.id },
    });
    expect(mismatch.status()).toBe(401);
    expect((await mismatch.json()).code).toBe("SESSION_USER_CHANGED");
    const mismatchWrite = await b.post("/api/resumes", {
      headers: { "X-Expected-User-Id": owner.id },
      data: {
        title: "Wrong identity",
        content: { fullName: "A's unsaved edits" },
      },
    });
    expect(mismatchWrite.status()).toBe(401);
    expect(await (await b.get("/api/resumes")).json()).toEqual([]);
  } finally {
    await a.dispose();
    await b.dispose();
  }
});

test("deleted accounts lose access even with a valid session cookie", async ({
  request,
}) => {
  const user = await register(request);
  const pool = new Pool({ connectionString: testDatabaseUrl });
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  } finally {
    await pool.end();
  }
  for (const url of ["/api/resumes", "/api/resumes/pdf", "/api/upload"]) {
    expect((await request.post(url, { data: {} })).status()).toBe(401);
  }
});

test("invalid requests return stable client errors and safe titles", async ({
  request,
}) => {
  await register(request);
  for (const data of [
    { title: " ", content: { fullName: "Draft" } },
    { title: "x".repeat(201), content: { fullName: "Draft" } },
    { title: "Draft", template: "unknown", content: { fullName: "Draft" } },
  ]) {
    expect((await request.post("/api/resumes", { data })).status()).toBe(400);
  }
  const created = await (
    await request.post("/api/resumes", {
      data: { title: "x".repeat(200), content: { fullName: "Draft" } },
    })
  ).json();
  expect(
    (
      await request.put(`/api/resumes/${created.id}`, {
        data: { template: "unknown" },
      })
    ).status(),
  ).toBe(400);
  const duplicate = await request.post(`/api/resumes/${created.id}/duplicate`);
  expect(duplicate.status()).toBe(201);
  expect((await duplicate.json()).title).toHaveLength(200);
  const long = await request.put(`/api/resumes/${created.id}`, {
    data: { content: { fullName: "x".repeat(500) } },
  });
  expect((await long.json()).title).toHaveLength(200);
  const blank = await request.put(`/api/resumes/${created.id}`, {
    data: { content: { fullName: "  " } },
  });
  expect((await blank.json()).title).toBe("Untitled Resume");
  const invalidJson = await request.post("/api/resumes", {
    data: "{",
    headers: { "Content-Type": "application/json" },
  });
  expect(invalidJson.status()).toBe(400);
  expect((await invalidJson.json()).code).toBe("INVALID_JSON");
  const oversized = await request.post("/api/resumes", {
    data: { content: "x".repeat(1024 * 1024 + 1) },
  });
  expect(oversized.status()).toBe(413);
  const crossOrigin = await request.post("/api/auth/login", {
    headers: { Origin: "https://attacker.example" },
    data: { username: "attacker", password },
  });
  expect(crossOrigin.status()).toBe(403);
  expect((await crossOrigin.json()).code).toBe("INVALID_ORIGIN");
  const missing = await request.get("/api/not-a-real-endpoint");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["cache-control"]).toBe("no-store");
  expect((await missing.json()).code).toBe("NOT_FOUND");
});

test("uploads reject unsupported, corrupt, oversized and extra multipart data", async ({
  request,
}) => {
  await register(request);
  for (const [mimeType, buffer, status, code] of [
    ["text/plain", Buffer.from("hello"), 400, "INVALID_FILE_TYPE"],
    [
      "application/pdf",
      Buffer.from("wrong magic bytes"),
      400,
      "INVALID_FILE_TYPE",
    ],
    [
      "application/pdf",
      Buffer.from("%PDF-1.4\ncorrupted"),
      400,
      "EXTRACTION_FAILED",
    ],
    [
      "application/pdf",
      Buffer.alloc(10 * 1024 * 1024 + 1),
      413,
      "FILE_TOO_LARGE",
    ],
  ] as const) {
    const response = await request.post("/api/upload", {
      multipart: { file: { name: "resume.pdf", mimeType, buffer } },
    });
    expect(response.status()).toBe(status);
    expect((await response.json()).code).toBe(code);
  }
  const response = await request.post("/api/upload", {
    multipart: { unexpected: "field" },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe("INVALID_UPLOAD");
});

test("browser registration, sign-out and sign-in preserve account privacy", async ({
  page,
}) => {
  const username = `browser_${randomUUID()}`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByTestId("button-save")).toBeVisible();
  userIds.push((await (await page.request.get("/api/auth/me")).json()).id);
  await expect(page.getByText("No resumes yet").last()).toBeVisible();
  await page.getByTestId("button-skip-upload").click();
  await page.getByTestId("input-fullname").fill("Browser Private Resume");
  await page.getByTestId("button-save").click();
  await expect(page.getByText("Resume saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId(/^resume-card-/).first()).toContainText(
    "Browser Private Resume",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("button-sign-out").click();
  await expect(page.getByTestId("auth-form")).toBeVisible();
  await expect(page.getByTestId("button-save")).toHaveCount(0);
  await signIn(page, username);
  await expect(page.getByTestId(/^resume-card-/).first()).toContainText(
    "Browser Private Resume",
  );
});

test("expired sessions retain unsaved editor content through same-user reauthentication", async ({
  page,
}) => {
  const user = await register(page.request);
  await page.goto("/");
  await page.getByTestId("button-skip-upload").click();
  await page.getByTestId("input-fullname").fill("Retained unsaved edits");
  const pool = new Pool({ connectionString: testDatabaseUrl });
  try {
    await pool.query("DELETE FROM user_sessions WHERE sess ->> 'userId' = $1", [
      user.id,
    ]);
  } finally {
    await pool.end();
  }
  await page.getByTestId("button-save").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("input-fullname")).toHaveValue(
    "Retained unsaved edits",
  );
  await signIn(page, user.username);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("input-fullname")).toHaveValue(
    "Retained unsaved edits",
  );
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/resumes")).json()).length,
    )
    .toBe(1);
});

test("two tabs sharing cookies cannot save or list data under the wrong identity", async ({
  page,
  context,
  playwright,
  baseURL,
}) => {
  const a = await register(page.request);
  const other = await playwright.request.newContext({ baseURL });
  const b = await register(other);
  await other.dispose();
  await page.goto("/");
  await page.getByTestId("button-skip-upload").click();
  await page.getByTestId("input-fullname").fill("A secret queued content");
  const second = await context.newPage();
  await second.goto("/");
  second.once("dialog", (dialog) => dialog.accept());
  await second.getByTestId("button-sign-out").click();
  await signIn(second, b.username);
  await page.getByTestId("button-save").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await (await second.request.get("/api/resumes")).json()).toEqual([]);
  const mismatch = await page.request.get("/api/resumes", {
    headers: { "X-Expected-User-Id": a.id },
  });
  expect(mismatch.status()).toBe(401);
  expect((await mismatch.json()).code).toBe("SESSION_USER_CHANGED");
  await expect(page.getByTestId(/^resume-card-/)).toHaveCount(0);
});

test("generated PDFs round-trip through the actual upload parser", async ({
  request,
}) => {
  await register(request);
  const generated = await request.post("/api/resumes/pdf", {
    data: {
      content: {
        fullName: "Roundtrip Candidate",
        title: "Software Engineer",
        summary: "Building reliable systems with TypeScript.",
      },
      template: "modern",
    },
  });
  expect(generated.status()).toBe(200);
  const uploaded = await request.post("/api/upload", {
    multipart: {
      file: {
        name: "generated-resume.pdf",
        mimeType: "application/pdf",
        buffer: await generated.body(),
      },
    },
  });
  expect(uploaded.status()).toBe(200);
  const result = await uploaded.json();
  expect(result.extractedText).toContain("Roundtrip Candidate");
  expect(result.parsedContent.fullName).toBe("Roundtrip Candidate");
});

test("sign-out cancels queued saves before another account signs in", async ({
  page,
  playwright,
  baseURL,
}) => {
  await register(page.request);
  const other = await playwright.request.newContext({ baseURL });
  const b = await register(other);
  await other.dispose();
  await page.goto("/");
  await page.getByTestId("button-skip-upload").click();
  let release!: () => void;
  let reached!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestReached = new Promise<void>((resolve) => {
    reached = resolve;
  });
  let intercepted = false;
  await page.route("**/api/resumes", async (route) => {
    if (route.request().method() !== "POST" || intercepted)
      return route.continue();
    intercepted = true;
    const response = await route.fetch();
    reached();
    await hold;
    try {
      await route.fulfill({ response });
    } catch {
      /* Expected when logout aborts the request. */
    }
  });
  try {
    await page
      .getByTestId("input-fullname")
      .fill("A original in-flight content");
    await page.getByTestId("button-save").click();
    await requestReached;
    await page.getByTestId("input-fullname").fill("A secret queued content");
    await page.keyboard.press("ControlOrMeta+s");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("button-sign-out").click();
    await signIn(page, b.username);
    release();
    expect(await (await page.request.get("/api/resumes")).json()).toEqual([]);
    await expect(page.getByTestId(/^resume-card-/)).toHaveCount(0);
  } finally {
    release();
  }
});

test("reauthentication on an unchanged editor does not create or overwrite resumes", async ({
  page,
}) => {
  const user = await register(page.request);
  await page.goto("/");
  async function expireAndRecover() {
    await page.getByTestId("input-file-upload").waitFor({ state: "attached" });
    const pool = new Pool({ connectionString: testDatabaseUrl });
    try {
      await pool.query(
        "DELETE FROM user_sessions WHERE sess ->> 'userId' = $1",
        [user.id],
      );
    } finally {
      await pool.end();
    }
    // A real upload 401 opens reauthentication without modifying the editor.
    await page.getByTestId("input-file-upload").setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await signIn(page, user.username);
    await page.waitForLoadState("networkidle");
  }
  await expireAndRecover();
  expect(await (await page.request.get("/api/resumes")).json()).toEqual([]);
  const created = await (
    await page.request.post("/api/resumes", {
      data: { title: "Original", content: { fullName: "Original Content" } },
    })
  ).json();
  await page.reload();
  await page.getByTestId(`resume-card-${created.id}`).click();
  await page.request.put(`/api/resumes/${created.id}`, {
    data: {
      title: "Newer server version",
      content: { fullName: "Newer server content" },
    },
  });
  await expireAndRecover();
  const unchanged = await (
    await page.request.get(`/api/resumes/${created.id}`)
  ).json();
  expect(unchanged.content.fullName).toBe("Newer server content");
  expect(unchanged.title).toBe("Newer server version");
});

test("stale deleted-user cookies permit logout and subsequent authentication", async ({
  playwright,
  baseURL,
}) => {
  for (const action of ["logout", "login", "register"]) {
    const request = await playwright.request.newContext({ baseURL });
    try {
      const user = await register(request);
      const pool = new Pool({ connectionString: testDatabaseUrl });
      try {
        await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
      } finally {
        await pool.end();
      }
      if (action === "logout") {
        expect((await request.post("/api/auth/logout")).status()).toBe(200);
      } else if (action === "login") {
        const login = await request.post("/api/auth/login", {
          data: { username: user.username, password },
        });
        expect(login.status()).toBe(400);
        expect((await login.json()).code).toBe("INVALID_CREDENTIALS");
      } else {
        await register(request);
      }
    } finally {
      await request.dispose();
    }
  }
});

for (const recovery of ["expired session", "failed logout"] as const) {
  test(`same-user recovery reuses a committed create ID after ${recovery}`, async ({
    page,
  }) => {
    const user = await register(page.request);
    await page.goto("/");
    await page.getByTestId("button-skip-upload").click();
    let release!: () => void;
    let reached!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const committed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const createIds: string[] = [];
    let originalId: string | undefined;
    await page.route("**/api/resumes", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      createIds.push(route.request().postDataJSON().id);
      if (createIds.length !== 1) return route.continue();
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      originalId = (await response.json()).id;
      reached();
      await hold;
      try {
        await route.fulfill({ response });
      } catch {
        /* Suspension intentionally aborts the original response. */
      }
    });
    try {
      await page
        .getByTestId("input-fullname")
        .fill("Original committed candidate");
      await page.getByTestId("button-save").click();
      await committed;
      await page.getByTestId("input-fullname").fill("Newest queued candidate");
      await page.getByTestId("input-fullname").blur();
      await expect(page.locator(".paginated-resume")).toContainText(
        "Newest queued candidate",
      );
      await page.keyboard.press("ControlOrMeta+s");
      if (recovery === "failed logout") {
        await page.route("**/api/auth/logout", (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              code: "INTERNAL_ERROR",
              message: "Temporary logout failure",
            }),
          }),
        );
        page.once("dialog", (dialog) => dialog.accept());
        await page.getByTestId("button-sign-out").click();
      } else {
        const pool = new Pool({ connectionString: testDatabaseUrl });
        try {
          await pool.query(
            "DELETE FROM user_sessions WHERE sess ->> 'userId' = $1",
            [user.id],
          );
        } finally {
          await pool.end();
        }
        await page.getByTestId("main-tab-upload").click();
        await page.getByTestId("input-file-upload").setInputFiles({
          name: "resume.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4 test"),
        });
      }
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByText(
          "Could not extract text from the file. Please try again.",
          { exact: true },
        ),
      ).toHaveCount(0);
      release();
      const retry = page.waitForRequest(
        (request) =>
          request.method() === "POST" && request.url().endsWith("/api/resumes"),
      );
      await signIn(page, user.username);
      expect((await retry).postDataJSON().id).toBe(originalId);
      await expect
        .poll(async () => {
          const resumes = await (await page.request.get("/api/resumes")).json();
          return resumes.map(
            (resume: { id: string; content: { fullName: string } }) => ({
              id: resume.id,
              fullName: resume.content.fullName,
            }),
          );
        })
        .toEqual([{ id: originalId, fullName: "Newest queued candidate" }]);
      expect(createIds).toEqual([originalId, originalId]);
    } finally {
      release();
    }
  });
}

for (const action of ["export", "delete", "duplicate"] as const) {
  test(`${action} authentication expiry shows reauthentication without a false operation error`, async ({
    page,
  }) => {
    const user = await register(page.request);
    const created = await (
      await page.request.post("/api/resumes", {
        data: {
          title: "Expiry Candidate",
          content: { fullName: "Expiry Candidate" },
        },
      })
    ).json();
    await page.goto("/");
    await page.getByTestId(`resume-card-${created.id}`).click();
    await expect(page.getByTestId("button-export")).toBeEnabled();
    const pool = new Pool({ connectionString: testDatabaseUrl });
    try {
      await pool.query(
        "DELETE FROM user_sessions WHERE sess ->> 'userId' = $1",
        [user.id],
      );
    } finally {
      await pool.end();
    }
    await page
      .getByTestId(
        action === "export"
          ? "button-export"
          : `button-${action}-resume-${created.id}`,
      )
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    for (const message of [
      "Could not generate PDF. Please try again.",
      "Failed to delete resume. Please try again.",
      "Failed to duplicate resume. Please try again.",
    ]) {
      await expect(page.getByText(message, { exact: true })).toHaveCount(0);
    }
    await signIn(page, user.username);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      (await (await page.request.get("/api/resumes")).json()).map(
        (row: { id: string }) => row.id,
      ),
    ).toEqual([created.id]);
  });
}

test("assigned legacy resumes with unsupported templates remain editable and savable", async ({
  page,
}) => {
  const user = await register(page.request);
  const pool = new Pool({ connectionString: testDatabaseUrl });
  let id: string;
  try {
    const result = await pool.query(
      "INSERT INTO resumes (owner_id, title, template, content) VALUES ($1, $2, $3, $4::jsonb) RETURNING id",
      [
        user.id,
        "Legacy Resume",
        "unsupported_legacy",
        JSON.stringify({
          fullName: "Legacy Candidate",
          summary: "Preserve this existing content",
        }),
      ],
    );
    id = result.rows[0].id;
  } finally {
    await pool.end();
  }
  await page.goto("/");
  await page.getByTestId(`resume-card-${id}`).click();
  await page.getByTestId("main-tab-edit").click();
  await expect(page.getByTestId("input-fullname")).toHaveValue(
    "Legacy Candidate",
  );
  await page.getByTestId("input-fullname").fill("Updated Legacy Candidate");
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/resumes/${id}`) &&
      response.request().method() === "PUT",
  );
  await page.getByTestId("button-save").click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    id,
    template: "modern",
    content: {
      fullName: "Updated Legacy Candidate",
      summary: "Preserve this existing content",
    },
  });
});
