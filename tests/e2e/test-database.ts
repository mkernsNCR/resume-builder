const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl)
  throw new Error(
    "E2E tests require DATABASE_URL pointing to an explicitly created test database",
  );
const parsedUrl = new URL(configuredUrl);
if (
  !/^postgres(ql)?:$/.test(parsedUrl.protocol) ||
  !/(test|hardening)/i.test(parsedUrl.pathname) ||
  /\/resume_builder\/?$/.test(parsedUrl.pathname)
) {
  throw new Error(
    "E2E DATABASE_URL must name a disposable test or hardening database; the application database is forbidden",
  );
}
export const testDatabaseUrl = configuredUrl;
