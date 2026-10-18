import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

test.describe("PDF Export", () => {
  test("should have export button disabled when no name is set", async ({
    page,
  }) => {
    await page.goto("/");

    // Create new resume without filling name
    await page.getByTestId("button-new-resume").click();

    // Export button should be disabled
    const exportButton = page.getByTestId("button-export");
    await expect(exportButton).toBeDisabled();
  });

  test("should enable export button when resume has content", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for resume cards to appear in sidebar
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Export button should be enabled
    const exportButton = page.getByTestId("button-export");
    await expect(exportButton).toBeEnabled();
  });

  test("should trigger PDF download on export click", async ({ page }) => {
    await page.goto("/");

    // Wait for resume cards to appear in sidebar
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const exportRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith("/api/resumes/pdf"),
    );

    // Click export button
    await page.getByTestId("button-export").click();

    // Wait for download to start
    const [download, exportRequest] = await Promise.all([
      downloadPromise,
      exportRequestPromise,
    ]);

    expect(exportRequest.postDataJSON()).toMatchObject({
      content: { fullName: expect.any(String) },
      template: expect.stringMatching(/^(modern|classic|minimal|creative)$/),
    });
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const pdf = await readFile(downloadPath!);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(pdf.length).toBeLessThan(1_000_000);

    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText();
      expect(result.pages.length).toBeGreaterThan(0);
      expect(
        result.pages
          .map((pdfPage) => pdfPage.text)
          .join("\n")
          .trim().length,
      ).toBeGreaterThan(50);
    } finally {
      await parser.destroy();
    }
  });
});

test("exports a long full name with a bounded title and download filename", async ({
  page,
}) => {
  const fullName = "Alexandra ".repeat(30).trim();
  await page.goto("/");
  await page.getByTestId("button-new-resume").click();
  await page.getByTestId("main-tab-edit").click();
  await page.getByTestId("input-fullname").fill(fullName);
  const exportResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/resumes/pdf") &&
      response.request().method() === "POST",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("button-export").click();
  const [response, download] = await Promise.all([
    exportResponse,
    downloadEvent,
  ]);
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    content: { fullName },
    title: fullName.slice(0, 200),
  });
  expect(download.suggestedFilename().length).toBeLessThanOrEqual(204);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
  const pdf = await readFile((await download.path())!);
  expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  const parser = new PDFParse({ data: pdf });
  try {
    const result = await parser.getText();
    const text = result.pages
      .map((page) => page.text)
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain(fullName);
  } finally {
    await parser.destroy();
  }
});

test("whitespace-only names preserve the fallback PDF filename", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("button-new-resume").click();
  await page.getByTestId("main-tab-edit").click();
  await page.getByTestId("input-fullname").fill("   ");
  await page.getByTestId("input-fullname").blur();
  await expect(page.getByTestId("button-export")).toBeEnabled();
  const responseEvent = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/resumes/pdf") &&
      response.request().method() === "POST",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("button-export").click();
  const [response, download] = await Promise.all([
    responseEvent,
    downloadEvent,
  ]);
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).not.toHaveProperty("title");
  expect(response.headers()["content-disposition"]).toContain(
    'filename="resume.pdf"',
  );
  expect(download.suggestedFilename()).toBe("resume.pdf");
  expect(await download.failure()).toBeNull();
});
