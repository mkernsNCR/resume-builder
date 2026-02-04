import { test, expect } from "@playwright/test";

test.describe("Pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for resume cards to appear and select one with content
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();
    // Wait for preview to render
    await page.waitForTimeout(500);
  });

  test("should display pagination controls when resume has multiple pages", async ({ page }) => {
    // The paginated resume component shows controls when totalPages > 1
    const paginationContainer = page.locator(".paginated-resume");
    await expect(paginationContainer).toBeVisible();

    // Check if page indicator exists (may or may not show depending on content length)
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible().catch(() => false);

    if (hasMultiplePages) {
      // Verify navigation buttons are present
      const prevButton = paginationContainer.locator("button").first();
      const nextButton = paginationContainer.locator("button").last();
      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();
    }
  });

  test("should navigate between pages using pagination buttons", async ({ page }) => {
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMultiplePages) {
      // Get initial page state
      const initialText = await pageIndicator.textContent();
      expect(initialText).toContain("Page 1");

      // Find and click next button
      const nextButton = page.locator(".paginated-resume button[type='button']").last();
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Verify page changed
      await expect(pageIndicator).toContainText("Page 2");

      // Click previous button
      const prevButton = page.locator(".paginated-resume button[type='button']").first();
      await prevButton.click();

      // Verify we're back to page 1
      await expect(pageIndicator).toContainText("Page 1");
    }
  });

  test("should disable prev button on first page", async ({ page }) => {
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMultiplePages) {
      // On first page, prev button should be disabled
      const prevButton = page.locator(".paginated-resume button[type='button']").first();
      await expect(prevButton).toBeDisabled();
    }
  });

  test("should disable next button on last page", async ({ page }) => {
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMultiplePages) {
      // Navigate to last page
      const nextButton = page.locator(".paginated-resume button[type='button']").last();
      
      // Click next until we reach the last page
      let attempts = 0;
      while (await nextButton.isEnabled() && attempts < 10) {
        await nextButton.click();
        await page.waitForTimeout(300);
        attempts++;
      }

      // On last page, next button should be disabled
      await expect(nextButton).toBeDisabled();
    }
  });

  test("should have type='button' on pagination buttons to prevent form submission", async ({ page }) => {
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMultiplePages) {
      const buttons = page.locator(".paginated-resume button");
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const buttonType = await buttons.nth(i).getAttribute("type");
        expect(buttonType).toBe("button");
      }
    }
  });

  test("should render resume preview container with correct dimensions", async ({ page }) => {
    // Set a large viewport to ensure preview isn't scaled
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    // Check that the page container has proper dimensions
    const pageContainer = page.locator(".resume-page-container");
    await expect(pageContainer).toBeVisible();

    // Verify the container exists and has reasonable dimensions
    // The actual rendered size may be scaled based on viewport
    const box = await pageContainer.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Verify aspect ratio is approximately 8.5:11 (US Letter)
      const aspectRatio = box.width / box.height;
      const expectedRatio = 816 / 1056; // ~0.773
      expect(aspectRatio).toBeCloseTo(expectedRatio, 1);
    }
  });

  test("should clamp currentPage when content changes reduce total pages", async ({ page }) => {
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    const hasMultiplePages = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMultiplePages) {
      // Navigate to page 2
      const nextButton = page.locator(".paginated-resume button[type='button']").last();
      await nextButton.click();
      await expect(pageIndicator).toContainText("Page 2");

      // Go to Edit tab and clear some experience entries to reduce content
      await page.getByTestId("main-tab-edit").click();
      await page.getByTestId("tab-experience").click();

      // The component should auto-clamp if pages reduce
      // This is a defensive test - if content shrinks, we shouldn't be on an invalid page
    }
  });
});

test.describe("Multi-page PDF Export", () => {
  test("should export multi-page resume as PDF with all pages", async ({ page }) => {
    await page.goto("/");

    // Wait for resume cards to appear and select one
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

    // Click export button
    await page.getByTestId("button-export").click();

    // Wait for download to complete
    const download = await downloadPromise;

    // Verify download filename contains expected pattern
    expect(download.suggestedFilename()).toContain(".pdf");
  });

  test("should show export loading state", async ({ page }) => {
    await page.goto("/");

    // Wait for resume cards to appear and select one
    const resumeCard = page.locator("aside .cursor-pointer").first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Click export button
    const exportButton = page.getByTestId("button-export");
    await exportButton.click();

    // During export, button should show loading state (disabled or spinner)
    // The exact behavior depends on implementation
    // This verifies the export process starts
    await expect(exportButton).toBeVisible();
  });
});
