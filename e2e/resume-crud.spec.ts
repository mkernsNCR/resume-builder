import { test, expect } from "@playwright/test";

test.describe("Resume CRUD Operations", () => {
  test("should create a new resume from scratch", async ({ page }) => {
    await page.goto("/");

    // Click New Resume button
    await page.getByTestId("button-new-resume").click();

    // Switch to Edit tab
    await page.getByTestId("main-tab-edit").click();

    // Fill in personal information
    await page.getByTestId("tab-personal").click();
    
    // Use data-testid selectors
    await page.getByTestId("input-fullname").fill("Test User");
    await page.getByTestId("input-title").fill("Software Engineer");
    await page.getByTestId("input-email").fill("test@example.com");

    // Save the resume
    await page.getByTestId("button-save").click();

    // Wait for save confirmation toast
    await expect(page.getByText("Resume saved", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("should load an existing resume from sidebar", async ({ page }) => {
    await page.goto("/");

    // Wait for resume cards to appear in sidebar using stable test-id selector
    const resumeCard = page.getByTestId(/^resume-card-/).first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Switch to Edit tab and verify data loaded
    await page.getByTestId("main-tab-edit").click();
    await page.getByTestId("tab-personal").click();

    // Verify some name is loaded (not empty)
    const fullNameInput = page.getByLabel("Full Name");
    await expect(fullNameInput).not.toHaveValue("");
  });

  test("should update an existing resume", async ({ page }) => {
    await page.goto("/");

    // Wait for resume cards to appear in sidebar using stable test-id selector
    const resumeCard = page.getByTestId(/^resume-card-/).first();
    await expect(resumeCard).toBeVisible({ timeout: 10000 });
    await resumeCard.click();

    // Switch to Edit tab
    await page.getByTestId("main-tab-edit").click();
    await page.getByTestId("tab-personal").click();

    // Update the summary
    const summaryInput = page.getByLabel("Professional Summary");
    await summaryInput.fill("Updated summary for testing purposes.");

    // Save the resume
    await page.getByTestId("button-save").click();

    // Wait for save confirmation
    await expect(page.getByText("Resume saved", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("should show delete button and remove resume from sidebar", async ({ page, request }) => {
    const createResponse = await request.post("/api/resumes", {
      data: {
        title: "Delete Button Test",
        template: "modern",
        content: {
          fullName: "Delete Button Test",
        },
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = await createResponse.json();
    const resumeId = created.id;

    await page.goto("/");

    const resumeCard = page.getByTestId(`resume-card-${resumeId}`);
    await expect(resumeCard).toBeVisible({ timeout: 10000 });

    const deleteButton = page.getByTestId(`button-delete-resume-${resumeId}`);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await expect(page.getByText("Resume deleted", { exact: true })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId(`resume-card-${resumeId}`)).toHaveCount(0);
  });

  test("should skip upload and create resume manually", async ({ page }) => {
    await page.goto("/");

    // Click "Create Resume Manually" button
    await page.getByTestId("button-skip-upload").click();

    // Should switch to Edit tab
    await expect(page.getByTestId("tab-personal")).toBeVisible();
  });
});
