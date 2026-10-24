import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";

const repository =
  process.env.GITHUB_REPOSITORY || "mightora/maturity.mightora.io";
const response = await fetch(
  `https://api.github.com/repos/${repository}/pages`,
  {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);
if (!response.ok)
  throw new Error(`Cannot read Pages configuration: HTTP ${response.status}`);
const pages = await response.json();
const url = new URL(pages.html_url);
console.log(
  JSON.stringify({
    url: url.href,
    customDomain: pages.cname,
    httpsEnforced: pages.https_enforced,
  }),
);

async function get(path) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const result = await fetch(new URL(path, url), {
        signal: AbortSignal.timeout(20000),
      });
      if (!result.ok) throw new Error(`${path}: HTTP ${result.status}`);
      if (new URL(result.url).protocol !== "https:")
        console.warn(
          `${path}: served over HTTP; HTTPS enforcement is checked separately after functional verification.`,
        );
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 5)
        await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  throw lastError;
}
const html = await (await get("./")).text();
if (!html.includes("Mightora Maturity Assessment"))
  throw new Error("Published application title missing");
const manifest = await (await get("build-info.json")).json();
const app = new Uint8Array(
  await (
    await get(`app.js?v=${manifest.appSha256.slice(0, 12)}`)
  ).arrayBuffer(),
);
if (createHash("sha256").update(app).digest("hex") !== manifest.appSha256)
  throw new Error("Published bundle does not match build manifest");
const offline = await (await get("offline.html")).text();
if (!offline.includes("Offline Edition – No Internet Connection Required"))
  throw new Error("Offline edition missing");
if (
  createHash("sha256").update(offline).digest("hex") !== manifest.offlineSha256
)
  throw new Error("Published offline edition does not match manifest");
const zip = new Uint8Array(
  await (await get("maturity-offline.zip")).arrayBuffer(),
);
if (zip[0] !== 80 || zip[1] !== 75) throw new Error("Offline ZIP missing");

await mkdir("qa/production", { recursive: true });
const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 500,
      hasTouch: viewport.width < 500,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url.href, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#samplePicker option")).toHaveCount(
        manifest.sampleCount,
      );
      await expect(page.locator("#templatePicker option")).toHaveCount(6);
      await page.locator("#samplePicker").selectOption("power-security");
      await page.locator("#useSample").click();
      await expect(page.locator("#capabilityRows tr[data-id]")).toHaveCount(21);
      await expect
        .poll(() =>
          page
            .locator("mightora-header .site-logo-brand-img")
            .first()
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBeTruthy();
      await expect(page.locator("mightora-author")).toContainText(
        "Ian Tweedie",
      );
      await expect(page.locator("mightora-footer .footer-main")).toBeVisible();
      const current = page
        .locator("#capabilityRows tr[data-id]")
        .first()
        .locator("[data-field=current]");
      await current.selectOption("5");
      await expect(current).toHaveValue("5");
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
      }
      if (viewport.width < 500) {
        await page.locator("#mobile-menu-btn").click();
        await expect(page.locator("#mobile-menu-btn")).toHaveAttribute(
          "aria-expanded",
          "true",
        );
        await page.keyboard.press("Escape");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBeTruthy();
      expect(errors).toEqual([]);
      await page.locator("[data-view=radar]").click();
      await page.locator("#visuals").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `qa/production/${viewport.width}.png` });
      console.log(
        `PASS ${viewport.width}px: branding, editing, six views, navigation and responsive layout`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log("PASS published asset hashes and offline downloads");
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `Verified ${url.href}: desktop/mobile branding, editing, all six views, responsive navigation, bundle hashes and offline downloads.\n\nCustom domain: ${pages.cname || "not configured"}. HTTPS enforced: ${pages.https_enforced}.\n`,
  );
}
if (pages.cname !== "maturity.mightora.io")
  throw new Error(
    "Set the Pages custom domain to maturity.mightora.io; the published default URL passed verification.",
  );
if (!pages.https_enforced)
  throw new Error(
    "Enable Enforce HTTPS in Pages after its certificate is issued.",
  );
