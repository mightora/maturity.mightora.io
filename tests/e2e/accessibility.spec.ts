import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test("WCAG automated checks and responsive screenshots", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Explore the complete Power Platform example",
    })
    .click();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(12);
  await page.waitForTimeout(150);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await info.attach("accessibility", {
    body: JSON.stringify(result.violations, null, 2),
    contentType: "application/json",
  });
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.locator("#theme-toggle").click();
  const dark = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    dark.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.locator("#theme-toggle").click();
  await mkdir("qa/screenshots", { recursive: true });
  await page.screenshot({
    path: `qa/screenshots/${info.project.name}-workspace.png`,
  });
  await page.locator("[data-view=radar]").click();
  await page.locator("#visuals").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `qa/screenshots/${info.project.name}-radar.png`,
  });
});
