import { test, expect } from "@playwright/test";

test.describe("Keyboard shortcuts", () => {
  test("number keys switch editor sections without hijacking text input", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("button-new-resume").click();

    await page.keyboard.press("2");
    await expect(page.getByTestId("main-tab-edit")).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.getByTestId("tab-experience")).toHaveAttribute(
      "data-state",
      "active",
    );

    await page.keyboard.press("1");
    const fullName = page.getByTestId("input-fullname");
    await fullName.fill("Candidate 5");

    await expect(page.getByTestId("tab-personal")).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(fullName).toHaveValue("Candidate 5");
  });
});
