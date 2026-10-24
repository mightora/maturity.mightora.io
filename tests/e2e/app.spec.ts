import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { template } from "../../src/templates.ts";
import { shareLink } from "../../src/transfer.ts";
async function example(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Explore the complete Power Platform example",
    })
    .click();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(12);
}
test("first launch is blank and examples require explicit selection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#welcomeDialog")).toBeVisible();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(0);
  await page.getByRole("button", { name: "Start a blank assessment" }).click();
  await expect(page.locator("#welcomeDialog")).not.toBeVisible();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(0);
  await expect(page.locator("#projectPicker option")).toHaveCount(1);
});
test("score edits update metrics radar heatmap and undo redo", async ({
  page,
}) => {
  await example(page);
  const first = page.locator("#capabilityRows tr[data-id]").first();
  await first.locator("[data-field=current]").selectOption("5");
  await expect(first.locator("[data-field=current]")).toHaveValue("5");
  await page.locator("[data-view=radar]").click();
  await expect(page.locator("#chartArea svg")).toBeVisible();
  await expect(page.locator("#chartArea circle")).not.toHaveCount(0);
  await page.locator("[data-view=heatmap]").click();
  await expect(page.locator("#chartArea")).toContainText("5 · Optimised");
  await page.locator("#undo").click();
  await expect(first.locator("[data-field=current]")).toHaveValue("2");
  await page.locator("#redo").click();
  await expect(first.locator("[data-field=current]")).toHaveValue("5");
});
test("all six views and shared filters work without page overflow", async ({
  page,
}) => {
  await example(page);
  for (const view of [
    "executive",
    "radar",
    "heatmap",
    "comparison",
    "gap",
    "history",
  ]) {
    await page.locator(`[data-view=${view}]`).click();
    await expect(page.locator("#chartArea svg")).toBeVisible();
    await expect(page.locator("#chartNote")).not.toBeEmpty();
  }
  await page.locator("#search").fill("Automated testing");
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(1);
  await page.locator("#resetFilters").click();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(12);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("workspace creation duplication switching and autosave survive reload", async ({
  page,
}) => {
  await example(page);
  await page.locator("#projectTitle").fill("Local saved assessment");
  await page.locator("#projectTitle").press("Tab");
  await expect(page.locator("#saveState")).toContainText("Saved locally");
  await page.reload();
  await expect(page.locator("#projectTitle")).toHaveValue(
    "Local saved assessment",
  );
  await page.locator("#duplicateProject").click();
  await expect(page.locator("#projectPicker option")).toHaveCount(2);
  await expect(page.locator("#projectTitle")).toHaveValue(
    "Local saved assessment copy",
  );
  await page.locator("#newProject").click();
  await page.getByRole("button", { name: "Start a blank assessment" }).click();
  await expect(page.locator("#projectPicker option")).toHaveCount(3);
  await page
    .locator("#projectPicker")
    .selectOption({ label: "Local saved assessment" });
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(12);
});
test("details criteria and injection-like text remain text", async ({
  page,
}) => {
  await example(page);
  await page.locator("#capabilityRows [data-row=details]").first().click();
  await page
    .locator("#detailFields [name=name]")
    .fill("<img src=x onerror=alert(1)>");
  await page
    .locator("#detailFields [name=evidence]")
    .fill("Evidence & <script>alert(1)</script>");
  await page.locator("#addCriterion").click();
  await expect(page.locator(".criteria-row")).toHaveCount(3);
  await page.locator("#detailSave").click();
  await expect(
    page.locator("#capabilityRows [data-field=name]").first(),
  ).toHaveValue("<img src=x onerror=alert(1)>");
  await expect(page.locator("#capabilityRows img")).toHaveCount(0);
  await page.locator("[data-view=heatmap]").click();
  await expect(page.locator("#chartArea")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("#chartArea img")).toHaveCount(0);
});
test("custom scale weighting and original snapshots remain independent", async ({
  page,
}) => {
  await example(page);
  await page.getByText("Maturity levels and scoring", { exact: true }).click();
  await page.locator("#addLevel").click();
  await expect(page.locator(".level-card")).toHaveCount(6);
  await page.locator("#weighted").check();
  await page
    .locator("#capabilityRows tr[data-id]")
    .first()
    .locator("[data-field=current]")
    .selectOption("6");
  await expect(page.locator("#methodology")).toContainText("Weighted mean");
  page.once("dialog", (d) => d.accept("October review"));
  await page.locator("#takeSnapshot").click();
  await expect(page.locator(".snapshot-card")).toHaveCount(3);
  await page
    .locator("#capabilityRows tr[data-id]")
    .first()
    .locator("[data-field=current]")
    .selectOption("1");
  await expect(page.locator(".snapshot-card").last()).toContainText(
    "October review",
  );
  await page.locator("[data-snapshot-copy]").last().click();
  await expect(
    page
      .locator("#capabilityRows tr[data-id]")
      .first()
      .locator("[data-field=current]"),
  ).toHaveValue("6");
});
test("JSON export is a complete backup and imports as a new project", async ({
  page,
}) => {
  await example(page);
  const download = page.waitForEvent("download");
  await page.locator("[data-export=json]").click();
  const file = await download;
  const data = await readFile((await file.path())!, "utf8");
  const a = JSON.parse(data);
  expect(a.schemaVersion).toBe(2);
  expect(a.snapshots).toHaveLength(2);
  await page.locator("#importFile").setInputFiles({
    name: "copy.json",
    mimeType: "application/json",
    buffer: Buffer.from(data),
  });
  await expect(page.locator("#projectPicker option")).toHaveCount(2);
});
test("malformed structured data and file imports report errors without damaging current data", async ({
  page,
}) => {
  await example(page);
  await page.locator("#editorMode").selectOption("json");
  await page
    .locator("#structuredSource")
    .fill('{"schemaVersion":2,"capabilities":[]}');
  await page.locator("#applySource").click();
  await expect(page.locator("#sourceErrors")).not.toBeEmpty();
  await page.locator("#editorMode").selectOption("visual");
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(12);
  await page.locator("#importFile").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"__proto__":{}}'),
  });
  await expect(page.locator("#toast")).toContainText("Unsafe object key");
});
test("bulk priority edits and selection are applied to the chosen rows", async ({
  page,
}) => {
  await example(page);
  await page.locator("#capabilityRows [data-select]").first().check();
  await page.locator("#bulkValue").fill("Low");
  await page.locator("#applyBulk").click();
  await expect(
    page
      .locator("#capabilityRows tr[data-id]")
      .first()
      .locator("[data-field=priority]"),
  ).toHaveValue("Low");
  await expect(
    page
      .locator("#capabilityRows tr[data-id]")
      .nth(2)
      .locator("[data-field=priority]"),
  ).toHaveValue("High");
});
test("shared read-only and embed views never overwrite the saved assessment", async ({
  page,
}) => {
  await example(page);
  await page.locator("#projectTitle").fill("Private local draft");
  await page.locator("#projectTitle").press("Tab");
  await expect(page.locator("#saveState")).toContainText("Saved locally");
  const base = "http://127.0.0.1:4173/";
  const shared = await shareLink(template("power", true), "view", base);
  await page.goto(shared);
  await expect(page.locator("#sharedBanner")).toContainText("read-only");
  await expect(page.locator("#projectTitle")).toBeDisabled();
  await page.goto("/");
  await expect(page.locator("#projectTitle")).toHaveValue(
    "Private local draft",
  );
  const embed = await shareLink(template("power", true), "embed", base);
  await page.goto(embed);
  await expect(page.locator("#workspace")).not.toBeVisible();
  await expect(page.locator("#visuals")).toBeVisible();
});
test("shared editable copy persists only after explicit Save as new local assessment", async ({
  page,
}) => {
  await example(page);
  await expect(page.locator("#saveState")).toContainText("Saved locally");
  const url = await shareLink(
    template("power", true),
    "edit",
    "http://127.0.0.1:4173/",
  );
  await page.goto(url);
  await page.locator("#projectTitle").fill("Temporary shared copy");
  await page.locator("#projectTitle").press("Tab");
  await page
    .getByRole("button", { name: "Save as new local assessment" })
    .click();
  await expect(page.locator("#projectPicker option")).toHaveCount(2);
  await expect(page.locator("#saveState")).toContainText("Saved locally");
  await page.reload();
  await expect(page.locator("#projectTitle")).toHaveValue(
    "Temporary shared copy",
  );
});
test("sticky navigation correct logo author footer and mobile menu work", async ({
  page,
}, info) => {
  await example(page);
  await expect(page.locator("mightora-header")).toHaveAttribute(
    "logo-light",
    /mightoraIoLogo4-200x900/,
  );
  await expect
    .poll(() =>
      page
        .locator("mightora-header .site-logo-brand-img")
        .first()
        .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
    )
    .toBeTruthy();
  await expect(page.locator("mightora-author")).toContainText("Ian Tweedie");
  await expect(page.locator("mightora-author")).toContainText(
    "Mightora Maturity Assessment",
  );
  await expect(page.locator("mightora-footer .footer-main")).toBeVisible();
  await page.locator('.quick-jump-nav a[href="#visuals"]').click();
  await page.waitForTimeout(150);
  const offsets = await page.evaluate(() => {
    const h = document
        .querySelector("mightora-header")!
        .getBoundingClientRect(),
      n = document.querySelector(".quick-jump-nav")!.getBoundingClientRect();
    return {
      top: h.top,
      height: h.height,
      nav: n.top,
      section: document.getElementById("visuals")!.getBoundingClientRect().top,
    };
  });
  expect(Math.abs(offsets.top)).toBeLessThan(2);
  expect(Math.abs(offsets.nav - offsets.height)).toBeLessThan(2);
  if (info.project.name.includes("mobile")) {
    await page.locator("#mobile-menu-btn").click();
    await expect(page.locator("#mobile-menu-btn")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.locator(".header-nav")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu-btn")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("keyboard chart point opens details with native dialog focus handling", async ({
  page,
}) => {
  await example(page);
  await page.locator("[data-view=radar]").click();
  const point = page.locator("#chartArea [data-cap]").first();
  await point.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detailsDialog")).toBeVisible();
  await expect(page.locator("#detailsDialog")).toContainText(
    "Assessment criteria",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#detailsDialog")).not.toBeVisible();
});
test("real browser exports produce Office JSON CSV SVG and high-resolution PNG files", async ({
  page,
}) => {
  await example(page);
  await page.locator("#reportDetails").uncheck();
  for (const type of ["pptx", "docx", "csv", "json", "svg", "png"]) {
    const pending = page.waitForEvent("download", { timeout: 45000 });
    await page.locator(`[data-export=${type}]`).first().click();
    const file = await pending;
    expect(file.suggestedFilename()).toMatch(
      new RegExp(`2026-10-20\\.${type}$`),
    );
    const content = await readFile((await file.path())!);
    expect(content.length).toBeGreaterThan(200);
    if (["pptx", "docx"].includes(type))
      expect(content.subarray(0, 2).toString()).toBe("PK");
    if (type === "png") expect(content.readUInt32BE(16)).toBe(2400);
  }
});
test("assessment edits and exports send no assessment content over network", async ({
  page,
}) => {
  await example(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const secret = "CONFIDENTIAL_TEST_STRING_839211";
  await page.locator("#projectTitle").fill(secret);
  await page.locator("#projectTitle").press("Tab");
  const pending = page.waitForEvent("download");
  await page.locator("[data-export=json]").click();
  await pending;
  await page.waitForTimeout(500);
  expect(requests.some((url) => url.includes(secret))).toBeFalsy();
  expect(
    requests.some((url) => url.startsWith("http") && url.includes("?")),
  ).toBeFalsy();
});
test("offline edition opens as file URL edits saves exports and makes no HTTP requests", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + resolve("dist/offline.html"));
  await expect(page.locator("#samplePicker option")).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "Download all sample projects (ZIP)" }),
  ).not.toBeVisible();
  await expect(
    page.getByText("Offline Edition – No Internet Connection Required", {
      exact: true,
    }),
  ).toBeVisible();
  await page.locator("#samplePicker").selectOption("cloud");
  await page.locator("#useSample").click();
  await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(9);
  await page.locator("#projectTitle").fill("Offline saved assessment");
  await page.locator("#projectTitle").press("Tab");
  await expect(page.locator("#saveState")).toContainText("Saved locally");
  await page.reload();
  await expect(page.locator("#projectTitle")).toHaveValue(
    "Offline saved assessment",
  );
  for (const v of ["radar", "heatmap", "comparison", "gap", "history"]) {
    await page.locator(`[data-view=${v}]`).click();
    await expect(page.locator("#chartArea svg")).toBeVisible();
  }
  await page.locator("#reportDetails").uncheck();
  for (const type of ["docx", "pptx", "json"]) {
    const pending = page.waitForEvent("download");
    await page.locator(`[data-export=${type}]`).click();
    const file = await pending;
    expect((await readFile((await file.path())!)).length).toBeGreaterThan(1000);
  }
  await expect
    .poll(() =>
      page
        .locator(".offline-header img")
        .evaluate((e: HTMLImageElement) => e.naturalWidth),
    )
    .toBe(900);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("complete sample catalogue loads each scenario as a separate editable assessment", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#samplePicker option")).toHaveCount(6);
  const keys = [
    "power",
    "general",
    "cloud",
    "devops",
    "security",
    "architecture",
  ];
  for (let i = 0; i < keys.length; i++) {
    if (i) await page.locator("#newProject").click();
    await page.locator("#samplePicker").selectOption(keys[i]);
    await page.locator("#useSample").click();
    await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(
      i === 0 ? 12 : 9,
    );
    await expect(page.locator("#projectPicker option")).toHaveCount(i + 1);
    await expect(page.locator("#welcomeDialog")).not.toBeVisible();
    for (const view of ["radar", "heatmap", "history"]) {
      await page.locator(`[data-view=${view}]`).click();
      await expect(page.locator("#chartArea svg")).toBeVisible();
    }
  }
  await page
    .locator("#capabilityRows tr[data-id]")
    .first()
    .locator("[data-field=current]")
    .selectOption("5");
  await expect(
    page
      .locator("#capabilityRows tr[data-id]")
      .first()
      .locator("[data-field=current]"),
  ).toHaveValue("5");
  await page.reload();
  await expect(page.locator("#projectPicker option")).toHaveCount(6);
});
