import { test, expect } from "@playwright/test";

test.describe("PDF Export", () => {
  test("should have export button disabled when no name is set", async ({ page }) => {
    await page.goto("/");

    // Create new resume without filling name
    await page.getByTestId("button-new-resume").click();

    // Export button should be disabled
    const exportButton = page.getByTestId("button-export");
    await expect(exportButton).toBeDisabled();
  });

  test("should enable export button when resume has content", async ({ page }) => {
    await page.goto("/");

    // Wait for resumes to load
    await page.waitForResponse((response) =>
      response.url().includes("/api/resumes") && response.status() === 200
    );

    // Click on the first resume in the sidebar
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await resumeCard.click();

    // Export button should be enabled
    const exportButton = page.getByTestId("button-export");
    await expect(exportButton).toBeEnabled();
  });

  test("should trigger PDF download on export click", async ({ page }) => {
    await page.goto("/");

    // Wait for resumes to load
    await page.waitForResponse((response) =>
      response.url().includes("/api/resumes") && response.status() === 200
    );

    // Click on the first resume in the sidebar
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await resumeCard.click();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

    // Click export button
    await page.getByTestId("button-export").click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename contains expected pattern
    expect(download.suggestedFilename()).toContain(".pdf");
  });
});
