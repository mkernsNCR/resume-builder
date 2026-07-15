import { test, expect } from "@playwright/test";
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
