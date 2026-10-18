import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { request as proxyRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { testDatabaseUrl } from "../tests/e2e/test-database";

// Run after npm run build, against an explicitly supplied disposable database.
// This is a real TLS-terminating proxy; all certificate material is temporary.
const pool = new Pool({ connectionString: testDatabaseUrl });
const temporary = await mkdtemp(
  path.join(tmpdir(), "resume-production-smoke-"),
);
const upstreamPort = 55438;
const proxyPort = 55439;
let child: ChildProcess | undefined;
let browser: Browser | undefined;
let userId: string | undefined;
let serverLog = "";
const proxy = createHttpsServer({
  // Filled below after generating an ephemeral certificate.
});
try {
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      path.join(temporary, "key.pem"),
      "-out",
      path.join(temporary, "cert.pem"),
      "-subj",
      "/CN=localhost",
    ],
    { stdio: "ignore" },
  );
  proxy.setSecureContext({
    key: await readFile(path.join(temporary, "key.pem")),
    cert: await readFile(path.join(temporary, "cert.pem")),
  });
  proxy.on("request", (incoming, outgoing) => {
    const forwarded = proxyRequest(
      {
        host: "127.0.0.1",
        port: upstreamPort,
        method: incoming.method,
        path: incoming.url,
        headers: {
          ...incoming.headers,
          "x-forwarded-proto": "https",
          "x-forwarded-for": "127.0.0.1",
        },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    forwarded.on("error", () => {
      outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(forwarded);
  });
  const legacy = await pool.query(
    "SELECT id, content, title FROM resumes WHERE owner_id IS NULL ORDER BY id",
  );
  const before = await pool.query("SELECT count(*)::int AS count FROM resumes");
  child = spawn(process.execPath, ["dist/index.cjs"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: testDatabaseUrl,
      SESSION_SECRET: randomBytes(32).toString("hex"),
      PORT: String(upstreamPort),
      TRUST_PROXY_HOPS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (data) => {
    serverLog += data.toString();
  });
  child.stderr?.on("data", (data) => {
    serverLog += data.toString();
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`Production server exited: ${serverLog}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${upstreamPort}/api/auth/me`)).ok;
    } catch {
      /* Wait for bind. */
    }
    if (ready) break;
    await delay(100);
  }
  assert(ready, `Production server did not become ready: ${serverLog}`);
  assert.deepEqual(
    (await pool.query("SELECT count(*)::int AS count FROM resumes")).rows,
    before.rows,
    "Production startup must not seed records",
  );
  assert.deepEqual(
    (
      await pool.query(
        "SELECT id, content, title FROM resumes WHERE owner_id IS NULL ORDER BY id",
      )
    ).rows,
    legacy.rows,
    "Legacy unowned records must survive untouched",
  );
  proxy.listen(proxyPort, "127.0.0.1");
  await once(proxy, "listening");
  browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|violates.*directive/i.test(message.text()))
      cspErrors.push(message.text());
  });
  const baseUrl = `https://127.0.0.1:${proxyPort}`;
  const htmlResponse = await page.goto(baseUrl);
  const csp = htmlResponse!.headers()["content-security-policy"];
  assert(csp.includes("script-src 'self'"));
  assert(!csp.match(/script-src[^;]*unsafe-/));
  const builtHtml = await readFile("dist/public/index.html", "utf8");
  for (const script of builtHtml.matchAll(
    /<script\b[^>]*>([\s\S]*?)<\/script>/g,
  ))
    assert.equal(script[1].trim(), "", "No inline production scripts");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page
    .getByLabel("Username", { exact: true })
    .fill(`smoke_${randomUUID()}`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(randomBytes(16).toString("hex"));
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("button-save").waitFor();
  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "connect.sid",
  );
  assert(
    sessionCookie?.secure &&
      sessionCookie.httpOnly &&
      sessionCookie.sameSite === "Lax",
    "Production session cookie must be Secure, HttpOnly, SameSite=Lax",
  );
  const me = await (await page.request.get(`${baseUrl}/api/auth/me`)).json();
  userId = me.id;
  assert(userId);
  await page.getByTestId("button-skip-upload").click();
  await page.getByTestId("input-fullname").fill("Production Smoke Candidate");
  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/resumes") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("button-save").click();
  assert.equal((await saveResponse).status(), 201);
  await page.reload();
  await page
    .getByTestId(/^resume-card-/)
    .first()
    .waitFor();
  assert.equal(
    (await (await page.request.get(`${baseUrl}/api/auth/me`)).json()).id,
    userId,
    "Session must persist through TLS proxy after reload",
  );
  const missing = await page.request.get(`${baseUrl}/api/missing`);
  assert.equal(missing.status(), 404);
  assert.equal(missing.headers()["cache-control"], "no-store");
  const pdf = await page.request.post(`${baseUrl}/api/resumes/pdf`, {
    data: {
      content: { fullName: "Production Smoke Candidate" },
      template: "modern",
    },
  });
  assert.equal(pdf.status(), 200);
  assert.equal((await pdf.body()).subarray(0, 4).toString(), "%PDF");
  assert.deepEqual(cspErrors, [], "Built production UI must not violate CSP");
  console.log(
    "Production HTTPS smoke passed: no seeding, legacy preservation, secure cookies, signup/editor/save/reload, PDF, JSON 404, no-store and CSP.",
  );
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  if (proxy.listening)
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  if (userId) {
    await pool.query("DELETE FROM user_sessions WHERE sess ->> 'userId' = $1", [
      userId,
    ]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  }
  await pool.end();
  await rm(temporary, { recursive: true, force: true });
}
