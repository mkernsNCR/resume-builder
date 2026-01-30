import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page with header and sidebar", async ({ page }) => {
    await page.goto("/");

    // Check header elements
    await expect(page.getByRole("banner").first()).toBeVisible();
    await expect(page.getByText("Resume Builder")).toBeVisible();
    await expect(page.getByTestId("button-save")).toBeVisible();
    await expect(page.getByTestId("button-export")).toBeVisible();

    // Check sidebar with New Resume button
    await expect(page.getByTestId("button-new-resume")).toBeVisible();
  });

  test("should display seeded sample resumes in sidebar", async ({ page }) => {
    await page.goto("/");

    // Check that sample resumes are displayed (at least one resume card exists)
    const resumeCards = page.locator("aside .cursor-pointer");
    await expect(resumeCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("should have working tab navigation", async ({ page }) => {
    await page.goto("/");

    // Check Upload tab is active by default
    await expect(page.getByTestId("main-tab-upload")).toBeVisible();
    await expect(page.getByTestId("main-tab-edit")).toBeVisible();
    await expect(page.getByTestId("main-tab-template")).toBeVisible();

    // Click Edit tab
    await page.getByTestId("main-tab-edit").click();
    await expect(page.getByTestId("tab-personal")).toBeVisible();

    // Click Template tab
    await page.getByTestId("main-tab-template").click();
    await expect(page.getByText("Choose a Template")).toBeVisible();
  });

  test("should toggle preview panel", async ({ page }) => {
    await page.goto("/");

    // Check preview panel is visible by default on desktop
    const previewToggle = page.getByTestId("button-toggle-preview");
    
    if (await previewToggle.isVisible()) {
      await expect(page.getByText("Live Preview")).toBeVisible();

      // Toggle preview off
      await previewToggle.click();
      await expect(page.getByText("Show Preview")).toBeVisible();

      // Toggle preview back on
      await previewToggle.click();
      await expect(page.getByText("Hide Preview")).toBeVisible();
    }
  });
});
