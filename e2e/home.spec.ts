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

  test("should allow scrolling at various window sizes", async ({ page }) => {
    await page.goto("/");

    // Test at desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    // Scroll down to check content is reachable
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Verify header is still accessible after scrolling
    await expect(page.getByText("Resume Builder")).toBeVisible();

    // Test at tablet size
    await page.setViewportSize({ width: 768, height: 1024 });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Verify content is reachable
    await expect(page.getByRole("banner").first()).toBeVisible();

    // Test at mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Scroll up and verify sidebar toggle is accessible
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Verify main content is still accessible
    await expect(page.getByRole("main").first()).toBeVisible();
  });

  test("should allow scrolling to bottom elements in editor and preview", async ({ page }) => {
    await page.goto("/");

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Click Edit tab to show the resume editor
    await page.getByTestId("main-tab-edit").click();

    // Scroll to bottom of editor content
    const editorContent = page.locator("[role='main']").first();
    await editorContent.evaluate((el) => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(500);

    // Click Template tab to show templates
    await page.getByTestId("main-tab-template").click();

    // Scroll to bottom of template selector
    const templateCards = page.locator("body");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Verify we can scroll back up and interact with header
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // Verify Save button is still accessible
    await expect(page.getByTestId("button-save")).toBeVisible();
  });
});
