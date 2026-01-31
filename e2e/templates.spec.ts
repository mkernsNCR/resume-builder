import { test, expect } from "@playwright/test";

test.describe("Resume Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for resume cards to appear in sidebar using stable test-id selector
    const resumeCard = page.getByTestId(/^resume-card-/).first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();
  });

  test("should display template selector with all options", async ({ page }) => {
    await page.getByTestId("main-tab-template").click();

    // Check all templates are available using stable test-id selectors
    await expect(page.getByTestId("template-option-modern")).toBeVisible();
    await expect(page.getByTestId("template-option-classic")).toBeVisible();
    await expect(page.getByTestId("template-option-minimal")).toBeVisible();
    await expect(page.getByTestId("template-option-creative")).toBeVisible();
  });

  test("should switch between templates", async ({ page }) => {
    await page.getByTestId("main-tab-template").click();

    // Click Classic template using stable test-id selector
    await page.getByTestId("template-option-classic").click();

    // Verify the template was selected (save should work)
    await page.getByTestId("button-save").click();
    await expect(page.getByText("Resume saved", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("should show live preview panel", async ({ page }) => {
    // Check that the live preview panel container is visible
    await expect(page.getByTestId("live-preview-panel")).toBeVisible();
  });
});
