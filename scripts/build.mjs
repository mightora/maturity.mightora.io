import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import yaml from "js-yaml";
import JSZip from "jszip";
import { SAMPLE_OPTIONS, sampleAssessment } from "../src/examples.ts";
import { validate } from "../src/engine.ts";
import { exportCsv } from "../src/transfer.ts";
const root = new URL("../", import.meta.url);
process.chdir(root.pathname);
const read = (path) => readFile(path, "utf8");
await rm("dist", { recursive: true, force: true });
await mkdir("dist/vendor", { recursive: true });
const [template, css, guide, licence, readme, sharedCss, footerYaml] =
  await Promise.all([
    read("index.html"),
    read("src/styles.css"),
    read("guide/content.html"),
    read("LICENSE"),
    read("docs/OFFLINE.md"),
    read("public/shared/shared.css"),
    read("public/shared/footer.yaml"),
  ]);
const bundled = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  target: ["es2022"],
  minify: true,
  legalComments: "eof",
});
const js = bundled.outputFiles[0].text;
const logo =
  "https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png";
const links = [
  { label: "Assess", url: "#workspace" },
  { label: "Visualise", url: "#visuals" },
  { label: "Guide", url: "#guide" },
  { label: "Mightora.io ↗", url: "https://mightora.io", ext: true },
];
const header = `<mightora-header site-name="Maturity Assessment" site-url="./" logo-light="${logo}" logo-dark="${logo}" nav-links='${JSON.stringify(links)}'><div class="container header-inner"><a href="#workspace"><img src="mightora-logo.png" width="180" height="40" alt="Mightora"></a><span>Maturity Assessment</span></div></mightora-header>`;
const bio =
  "Mightora Maturity Assessment is a free tool created by Ian Tweedie, also known online as TechTweedie. Ian is a technology consultant and developer based in North East England with a background in enterprise IT, cloud infrastructure and developer tooling. He builds free, practical tools and writes about technology on his blog.";
const author = (offline = false) =>
  `<${offline ? 'section class="author-section offline-author"' : "mightora-author"}><div class="author-section-overlay"><div class="author-section-inner"><div class="author-photos"><img src="${offline ? "data:image/png;base64," + assets.avatar : "https://techtweedie.github.io/images/author/ian-tweedie-sq2_hu_a380911c6f4726de.png"}" alt="Ian Tweedie" class="author-avatar" width="110" height="110"><img src="${offline ? "data:image/png;base64," + assets.blog : "https://raw.githubusercontent.com/TechTweedie/techtweedie.github.io/v2/assets/images/site/main-logo.png"}" alt="TechTweedie" class="author-blog-logo" width="60" height="60"></div><div class="author-text"><h2 class="author-heading">Built by TechTweedie</h2><p class="author-bio">${bio}</p><div class="author-links"><a href="https://techtweedie.github.io" target="_blank" rel="noopener noreferrer">Blog</a><a href="https://github.com/itweedie" target="_blank" rel="noopener noreferrer">GitHub</a></div></div></div></div></${offline ? "section" : "mightora-author"}>`;
const repo = "https://github.com/mightora/maturity.mightora.io";
const evidence = [
  [
    "Build and tests",
    `${repo}/actions/workflows/ci.yml`,
    `${repo}/actions/workflows/ci.yml/badge.svg`,
  ],
  [
    "CodeQL",
    `${repo}/actions/workflows/codeql.yml`,
    `${repo}/actions/workflows/codeql.yml/badge.svg`,
  ],
  [
    "MIT licence",
    `${repo}/blob/main/LICENSE`,
    "https://img.shields.io/badge/licence-MIT-1769aa",
  ],
  ["GitHub source", repo, "https://img.shields.io/badge/source-GitHub-102a43"],
  [
    "GitHub Pages",
    `${repo}/actions/workflows/deploy.yml`,
    `${repo}/actions/workflows/deploy.yml/badge.svg`,
  ],
];
const badges = (offline = false) =>
  `<section class="quality-badges" aria-label="Quality and open-source evidence">${evidence.map(([label, url, image]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${offline ? label : `<img src="${image}" alt="${label}" loading="lazy">`}</a>`).join("")}<small>Open source under the MIT licence and independently inspectable. Status links show repository evidence, not a security certification.${offline ? " Online evidence requires an internet connection." : ""}</small></section>`;
const bottom = `<div class="container"><div class="footer-bottom"><div class="footer-copy">Maturity Assessment by <a href="https://mightora.io">Mightora</a>. <a href="${repo}">GitHub source</a> · <a href="${repo}/blob/main/LICENSE">MIT licence</a> · <a href="#guide">User guide</a> · <a href="#privacy">Privacy</a></div></div></div>`;
const assets = {
  logo: (await readFile("public/mightora-logo.png")).toString("base64"),
  avatar: (await readFile("public/ian-tweedie.png")).toString("base64"),
  blog: (await readFile("public/techtweedie.png")).toString("base64"),
};
const patch = `// Preserve the documented shared footer YAML indentation workaround.\nconst nativeFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{const url=typeof input==='string'?input:input.url;const response=await nativeFetch(input,init);if(url&&url.includes('footer.yaml')){const text=await response.text();return new Response(text.replace(/\\t/g,'  '),{status:response.status,statusText:response.statusText,headers:response.headers});}return response;};\n`;
const onlineCsp =
  "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; object-src 'none'; base-uri 'none'; form-action 'none'; media-src 'none'";
const sub = (values) =>
  template.replace(/<!-- ([A-Z_]+) -->/g, (_, key) => values[key] ?? "");
const online = sub({
  CSP: `<meta http-equiv="Content-Security-Policy" content="${onlineCsp}">`,
  STYLES:
    '<link rel="stylesheet" href="vendor/shared.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/shared.css"><link rel="stylesheet" href="styles.css">',
  SHARED:
    '<script src="vendor/footer-workaround.js" defer></script><script src="vendor/js-yaml.min.js" defer></script><script src="https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/components.js" defer></script><script src="vendor/shared-fallback.js" defer></script>',
  BRAND_HEADER: header,
  GUIDE: guide,
  BRAND_AUTHOR: author(),
  QUALITY_BADGES: badges(),
  BRAND_FOOTER: `<mightora-footer local-yaml-url="footer.yaml">${bottom}</mightora-footer>`,
  APP_SCRIPT: `<script src="app.js?v=${createHash("sha256").update(js).digest("hex").slice(0, 12)}" defer></script>`,
});
const offlineHeader = `<header class="offline-header"><a href="#workspace"><img src="data:image/png;base64,${assets.logo}" alt="Mightora" width="180" height="40"></a><strong>Maturity Assessment</strong><button class="btn offline-menu" id="offlineMenu" aria-expanded="false" aria-controls="offlineNav" aria-label="Open navigation menu">☰</button><nav id="offlineNav" class="offline-nav" aria-label="Main navigation">${links.map((l) => `<a href="${l.url}">${l.label}</a>`).join("")}</nav><span class="offline-label">Offline Edition – No Internet Connection Required</span></header>`;
const footer = yaml.load(footerYaml.replace(/\t/g, "  "));
if (!Array.isArray(footer.sections))
  throw new Error("Shared footer snapshot is invalid");
const offlineFooter = `<footer class="site-footer offline-footer"><div class="container"><div class="footer-main">${footer.sections.map((s) => `<div class="footer-col"><h3>${escapeHtml(s.title)}</h3><ul class="footer-links">${s.links.map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.name)}</a></li>`).join("")}</ul></div>`).join("")}</div></div>${bottom}</footer>`;
function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
const offlineCss =
  sharedCss.replace(/url\(['"]https?:[^)]+\)/g, "none") +
  "\n" +
  css +
  "\n[data-online]{display:none!important}";
const safeJs = js.replace(/<\/script/gi, "<\\/script");
const hash = (s) =>
  `'sha256-${createHash("sha256").update(s).digest("base64")}'`;
const offlineCsp = `default-src 'none'; script-src ${hash(safeJs)}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; media-src 'none'; worker-src 'none'`;
const offline = sub({
  CSP: `<meta http-equiv="Content-Security-Policy" content="${offlineCsp}">`,
  STYLES: `<style>${offlineCss}</style>`,
  BRAND_HEADER: offlineHeader,
  GUIDE: guide,
  BRAND_AUTHOR: author(true),
  QUALITY_BADGES: badges(true),
  BRAND_FOOTER: offlineFooter,
  APP_SCRIPT: `<script>${safeJs}</script>`,
});
await cp("public", "dist", { recursive: true });
await cp(
  "node_modules/js-yaml/dist/js-yaml.min.js",
  "dist/vendor/js-yaml.min.js",
);
await cp("public/shared/shared.css", "dist/vendor/shared.css");
await cp("public/shared/components.js", "dist/vendor/components.js");
await mkdir("dist/data", { recursive: true });
await writeFile("dist/data/config.json", "{}");
await writeFile(
  "dist/vendor/shared-fallback.js",
  `if(!customElements.get('mightora-header')){const s=document.createElement('script');s.src='vendor/components.js';document.head.append(s);}`,
);
await Promise.all([
  writeFile("dist/index.html", online),
  writeFile("dist/styles.css", css),
  writeFile("dist/app.js", js),
  writeFile("dist/vendor/footer-workaround.js", patch),
  writeFile("dist/footer.yaml", footerYaml.replace(/\t/g, "  ")),
  writeFile("dist/offline.html", offline),
  writeFile("dist/.nojekyll", ""),
  writeFile("dist/CNAME", "maturity.mightora.io\n"),
  writeFile("dist/LICENSE", licence),
]);
const zip = new JSZip();
zip.file("index.html", offline);
zip.file("README.md", readme);
zip.file("LICENSE", licence);
await writeFile(
  "dist/maturity-offline.zip",
  await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
// Sample projects are generated from the same catalogue used by both editions.
const samples = new JSZip();
await mkdir("dist/examples", { recursive: true });
for (const option of SAMPLE_OPTIONS) {
  const project = validate(sampleAssessment(option.key));
  const stem =
    option.key === "power"
      ? "power-platform-governance"
      : option.key === "power-security"
        ? "power-platform-security"
        : option.key;
  const json = JSON.stringify(project, null, 2);
  const csv = exportCsv(project);
  samples.file(`${stem}.maturity.json`, json);
  samples.file(`${stem}.csv`, csv);
  await writeFile(`dist/examples/${stem}.maturity.json`, json);
  await writeFile(`dist/examples/${stem}.csv`, csv);
}
samples.file(
  "README.md",
  `# Mightora Maturity Assessment samples

Eight fictional assessments: delivery maturity, Power Platform governance, Power Platform security, organisational capability, Cloud/Azure, DevOps, cybersecurity and enterprise architecture.

Open Mightora Maturity Assessment and choose Import a JSON or CSV project. Import a .maturity.json file for the complete assessment including hierarchy, evidence, weights and two historical snapshots. CSV is for capability-level tabular editing, not a complete project backup.

Each scenario can also be selected from New assessment → Complete sample assessment, online or offline. Existing projects are retained. All samples are editable, can be exported into Word/PowerPoint and can be deleted independently.

The cybersecurity example deliberately includes an unassessed capability. Delivery, Power Platform security, Cloud, DevOps and cybersecurity use weighted scoring; other examples use equal weighting. Missing scores are excluded, not scored as zero. Business priority is independent of gap size.

All organisations, observations, scores and outcomes are fictional teaching material, not claims of compliance or certified assessments. Replace sample evidence before making real decisions.
`,
);
samples.file("LICENSE", licence);
await writeFile(
  "dist/maturity-samples.zip",
  await samples.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
const manifest = {
  sampleCount: SAMPLE_OPTIONS.length,
  version: "1.0.0",
  builtAt: new Date().toISOString(),
  appSha256: createHash("sha256").update(js).digest("hex"),
  offlineSha256: createHash("sha256").update(offline).digest("hex"),
  source: "src/main.ts",
  sharedUiSource: "https://github.com/mightora/shared-ui",
  sharedUiSnapshot: "2026-10-20",
};
await writeFile("dist/build-info.json", JSON.stringify(manifest, null, 2));
await mkdir("dist/guide", { recursive: true });
await writeFile(
  "dist/guide/index.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mightora Maturity Assessment User Guide</title><link rel="stylesheet" href="../styles.css"><main class="shell panel prose-panel"><a href="../">Return to assessment</a><h1>Mightora Maturity Assessment User Guide</h1>${guide}</main></html>`,
);
console.log(
  `Built static site and self-contained offline edition (${(Buffer.byteLength(offline) / 1048576).toFixed(2)} MB).`,
);
