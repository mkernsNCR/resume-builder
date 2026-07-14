import { expect, test } from "@playwright/test";

test.describe("Undo and redo", () => {
  test("coalesces editor typing and handles shortcuts inside the active input", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("button-new-resume").click();
    await page.getByTestId("main-tab-edit").click();
    await page.getByTestId("tab-experience").click();
    await page.getByTestId("button-add-experience").click();

    const company = page.getByTestId("input-company-0");
    await company.pressSequentially("Acme Corporation", { delay: 20 });
    await expect(company).toHaveValue("Acme Corporation");

    // Let the typing burst commit as a single history entry, while retaining focus.
    await page.waitForTimeout(200);
    await company.press("ControlOrMeta+z");
    await expect(company).toHaveValue("");

    await company.press("ControlOrMeta+Shift+z");
    await expect(company).toHaveValue("Acme Corporation");
  });
});
