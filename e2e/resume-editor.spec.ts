import { test, expect } from "@playwright/test";

test.describe("Resume Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("button-new-resume").click();
    await page.getByTestId("main-tab-edit").click();
  });

  test("should navigate between editor tabs", async ({ page }) => {
    // Personal tab
    await page.getByTestId("tab-personal").click();
    await expect(page.getByTestId("input-fullname")).toBeVisible();

    // Experience tab
    await page.getByTestId("tab-experience").click();
    await expect(page.getByTestId("button-add-experience")).toBeVisible();

    // Education tab
    await page.getByTestId("tab-education").click();
    await expect(page.getByTestId("button-add-education")).toBeVisible();

    // Skills tab
    await page.getByTestId("tab-skills").click();
    await expect(page.getByTestId("input-add-skill")).toBeVisible();

    // Projects tab
    await page.getByTestId("tab-projects").click();
    await expect(page.getByRole("button", { name: /add project/i })).toBeVisible();
  });

  test("should fill out personal information form", async ({ page }) => {
    await page.getByTestId("tab-personal").click();

    // Fill personal info fields using data-testid
    await page.getByTestId("input-fullname").fill("Jane Doe");
    await page.getByTestId("input-title").fill("Product Manager");
    await page.getByTestId("input-email").fill("jane.doe@example.com");
    await page.getByTestId("input-phone").fill("+1 555-123-4567");
    await page.getByTestId("input-location").fill("New York, NY");

    // Verify fields are filled
    await expect(page.getByTestId("input-fullname")).toHaveValue("Jane Doe");
    await expect(page.getByTestId("input-email")).toHaveValue("jane.doe@example.com");
  });

  test("should add work experience entry", async ({ page }) => {
    await page.getByTestId("tab-experience").click();

    // Click Add Experience button
    await page.getByTestId("button-add-experience").click();

    // Fill experience form using placeholders
    await page.getByPlaceholder("Company name").first().fill("Acme Corp");
    await page.getByPlaceholder("Job title").first().fill("Senior Developer");

    // Verify the entry is added
    await expect(page.locator("input[value='Acme Corp']")).toBeVisible();
  });

  test("should add education entry", async ({ page }) => {
    await page.getByTestId("tab-education").click();

    // Click Add Education button
    await page.getByTestId("button-add-education").click();

    // Fill education form - find inputs within the education item
    const eduItem = page.getByTestId("education-item-0");
    await eduItem.locator("input").first().fill("MIT");

    // Verify the entry is added
    await expect(page.locator("input[value='MIT']")).toBeVisible();
  });

  test("should add skill entry", async ({ page }) => {
    await page.getByTestId("tab-skills").click();

    // Type skill in the input and press Enter
    const skillInput = page.getByTestId("input-add-skill");
    await skillInput.fill("TypeScript");
    await skillInput.press("Enter");

    // Verify the skill badge is added
    await expect(page.getByTestId("skill-badge-0")).toBeVisible();
  });

  test("should add project entry", async ({ page }) => {
    await page.getByTestId("tab-projects").click();

    // Click Add Project button
    await page.getByRole("button", { name: /add project/i }).click();

    // Fill project form using placeholder
    await page.getByPlaceholder("Project name").first().fill("My App");

    // Verify the entry is added
    await expect(page.locator("input[value='My App']")).toBeVisible();
  });
});
