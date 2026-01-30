import { test, expect } from "@playwright/test";

test.describe("Resume Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for resume cards to appear in sidebar
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();
  });

  test("should display template selector with all options", async ({ page }) => {
    await page.getByTestId("main-tab-template").click();

    // Check all templates are available
    await expect(page.getByText("Modern")).toBeVisible();
    await expect(page.getByText("Classic")).toBeVisible();
    await expect(page.getByText("Minimal")).toBeVisible();
    await expect(page.getByText("Creative")).toBeVisible();
  });

  test("should switch between templates", async ({ page }) => {
    await page.getByTestId("main-tab-template").click();

    // Wait for template options to be visible then click Classic
    await page.getByText("Classic").first().click();

    // Verify the template was selected (save should work)
    await page.getByTestId("button-save").click();
    await expect(page.getByText("Resume saved", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("should show live preview panel", async ({ page }) => {
    // Check that Live Preview heading is visible
    await expect(page.getByText("Live Preview")).toBeVisible();
  });
});
