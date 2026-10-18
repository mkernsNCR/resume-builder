import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { testDatabaseUrl } from "./test-database";
export { expect };
export type { Page } from "@playwright/test";

type Account = {
  state: Awaited<ReturnType<APIRequestContext["storageState"]>>;
};

export const test = base.extend<Record<string, never>, { account: Account }>({
  account: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      const username = `worker_${randomUUID()}`;
      let userId: string | undefined;
      try {
        const response = await request.post("/api/auth/register", {
          data: { username, password: "TestPassword123!" },
        });
        expect(response.status()).toBe(201);
        userId = (await response.json()).id;
        const seed = await request.post("/api/resumes", {
          data: {
            title: "Sample Engineer Resume",
            template: "modern",
            content: {
              fullName: "Sample Engineer",
              title: "Software Engineer",
              summary:
                "Engineer building reliable applications and collaborating with teams to deliver useful products.",
              contact: { email: "sample@example.com", location: "New York" },
              experience: [
                {
                  id: "exp-1",
                  company: "Example Company",
                  position: "Engineer",
                  startDate: "2020",
                  current: true,
                  highlights: [
                    "Improved application performance by 40%",
                    "Built reliable services used by 1000 customers",
                  ],
                },
              ],
              education: [
                {
                  id: "edu-1",
                  institution: "Example University",
                  degree: "Computer Science",
                  startDate: "2016",
                  endDate: "2020",
                },
              ],
              skills: [{ id: "skill-1", name: "TypeScript", level: "expert" }],
              projects: [],
            },
          },
        });
        expect(seed.status()).toBe(201);
        await use({ state: await request.storageState() });
      } finally {
        if (userId) {
          const pool = new Pool({ connectionString: testDatabaseUrl });
          try {
            await pool.query(
              "DELETE FROM user_sessions WHERE sess ->> 'userId' = $1",
              [userId],
            );
            await pool.query("DELETE FROM users WHERE id = $1", [userId]);
          } finally {
            await pool.end();
          }
        }
        await request.dispose();
      }
    },
    { scope: "worker" },
  ],
  storageState: async ({ account }, use) => {
    await use(account.state);
  },
});
