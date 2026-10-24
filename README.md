# Mightora Maturity Assessment

A free, MIT-licensed static browser application for assessing enterprise capabilities, comparing current and target maturity, and turning evidence into an improvement plan. Inspired by Mightora Technology Radar. No backend, account, database server, paid API or AI service is required.

Intended repository: https://github.com/mightora/maturity.mightora.io

Intended GitHub Pages domain: https://maturity.mightora.io

These are deployment targets. See [verification](docs/VERIFICATION.md) for actual publication status. Repository workflow badges become evidence once the repository exists and workflows have run. They do not imply security certification.

## What you can do

- Maintain up to 40 assessments locally, with autosave, manual save, duplication, reset, clear and 50-step undo/redo.
- Define domains, optional capability groups, capabilities and assessment criteria with stable IDs. Rename, move, duplicate or reorder capabilities and domains.
- Edit current and target scores, evidence, risks, recommendations, owners, business priority, weights and completion dates. Search/filter and bulk update rows.
- Configure 2–10 maturity levels, colours, descriptions, scoring guidance and evidence requirements. Not assessed and Not applicable remain distinct, excluded states.
- Explore executive, radar, heatmap, horizontal comparison, gap analysis and historical views. Use keyboard-accessible points, an accessible data table, chart pagination, zoom, line-style controls, labels and colour themes.
- Capture independent snapshots of metadata, scales, structure, criteria, evidence and scores. Compare overall, domain or capability trends against original scales.
- Start from six illustrative frameworks: general capability, Power Platform, Cloud/Azure, DevOps, cybersecurity/governance or enterprise architecture. A complete fictional Power Platform assessment demonstrates evidence, actions and history.
- Export complete JSON, capability CSV, SVG, 2400-pixel-wide PNG, editable PowerPoint, editable Word, or print/save PDF.
- Share read-only assessment snapshots, summaries, embedded charts, or explicitly editable copies in compressed URL fragments. Read-only links do not touch your local workspace.
- Run a standalone offline HTML directly from disk. All code, export libraries, styles and required images are embedded, with outbound application connections blocked by CSP.

## Quick start

Open the deployed application, choose **Start blank**, **Explore the complete Power Platform example**, a template or an imported project. Examples never silently mix into your own assessments. In **Framework**, define your domains and maturity scale. Add capabilities and use **Details** to record evidence, criteria and recommendations. Change current/target dropdowns to refresh every view. Capture a snapshot before reassessing. Export complete JSON regularly.

The full [user guide](guide/content.html) is embedded in the application and built as `/guide/`. It includes a step-by-step Power Platform walkthrough, scoring examples, interpretation, sharing, keyboard use, limits and offline instructions.

## Editable Office exports

PowerPoint uses native radar and horizontal bar charts linked to embedded Excel workbooks. In PowerPoint, select the chart, choose **Chart Design → Edit Data**, and edit the workbook. Labels, legends, series, fills, values, text and tables remain editable. Missing values are blank cells. Long labels may be abbreviated in a chart; full labels appear in the score tables. Detailed slides include full evidence, criteria, risks, recommendations and notes, with continuation slides when needed.

Word contains native editable paragraphs, heading styles, score/comparison tables, criteria, evidence, improvement roadmap, headers, footers, a contents field and appendices. It explicitly uses **editable comparison tables as the alternative to an editable radar**. It does not claim to provide a Word radar chart. Update the contents field in Word after opening.

SVG and PNG are visual snapshots. They do not replace the editable Office exports. Custom report fonts must be available on the recipient’s device. Generated packages are structurally checked. Representative reports are rendered with LibreOffice where available; this is different from testing in Microsoft Office.

## Scoring

Unweighted score = sum of numeric capability scores / count of scored capabilities.

Weighted score = sum(score × weight) / sum(weights of scored capabilities).

Current and target averages use their own scored populations. Not assessed (`null`) and Not applicable (`"NA"`) never become zero. Gap = target − current, only for paired numeric scores. Negative gaps are allowed. Average paired gap may differ from target mean minus current mean. Priorities are independent judgements; the largest gap need not be the highest priority. These generic ordinal scales provide descriptive indicators and do not certify compliance.

## Development

Use Node.js 24 and Python 3 for the static preview server.

```sh
npm ci
npm run check
npm run build
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run samples
node scripts/package.mjs
```

`npm run verify` runs type checking, build, unit tests and browser tests. On systems with an existing Chromium, set `CHROME_BINARY` to its absolute executable path. Chromium desktop and mobile suites run by default. Firefox/WebKit require their engines and platform dependencies; see verification notes for what was actually run.

For manual preview:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173/. For offline use, open `dist/offline.html` directly; no server is needed. Generated download files appear in `release/`. Build output is generated; edit maintained source files, not `dist`.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/model.ts` | Versioned data contracts, stable IDs, scale definitions, states and formatting |
| `src/engine.ts` | Validation, legacy migration, weighted scoring, snapshots, prioritisation and undo/redo |
| `src/templates.ts` | Six generic example frameworks and complete Power Platform scenario |
| `src/storage.ts` | IndexedDB workspace with browser-storage fallback |
| `src/transfer.ts` | CSV/JSON transfer and bounded gzip fragment sharing |
| `src/visuals.ts` | Six SVG visualisations from validated data |
| `src/exports.ts` | Browser Office exports, downloads and PNG rasterisation |
| `src/main.ts` | Accessible UI, workspace orchestration and interactions |
| `scripts/build.mjs` | Shared-brand online build, same-source self-contained offline edition and ZIP |

No runtime coupling exists to the Radar website. Its conventions and earlier maturity implementation informed this project. Legacy version 1 project JSON migrates to schema version 2 while retaining capability IDs. [Data format](docs/DATA_FORMAT.md), [security](SECURITY.md), [offline guide](docs/OFFLINE.md) and [deployment](docs/DEPLOYMENT.md) describe the contracts and boundaries.

## Privacy and network transparency

All assessment processing and exports run locally. No application analytics, advertising, cookies, tracking identifiers or assessment-content telemetry are used. Workspace IDs identify documents and capabilities, not visitors.

The online edition requests the shared Mightora stylesheet/components from jsDelivr, the local footer YAML and js-yaml, official branding images and status badge assets. Shared CSS may request its author background image. Bundled copies provide a fallback if shared assets fail. Remote hosts receive ordinary connection metadata. Application content is never used as request parameters. A Resource Timing summary and Developer Tools instructions are available in the application.

Links contain compressed data in the fragment, are not encrypted, and can be inspected by anyone possessing the link. They may remain in browser history. Summaries deliberately remove supporting evidence and selected personal fields, but review all remaining content before sharing. Local browser storage is not a secure or synchronised backup. Use JSON exports and an approved secure channel for confidential work.

## CI and release

Workflows provide build/type/unit/browser checks, CodeQL, weekly dependency scanning, GitHub Pages deployment, offline packaging and tagged release artifacts. Dependabot checks npm packages and Actions weekly. The image-size override selects the patched 2.0.4 release used by PptxGenJS; js-yaml uses patched 4.3.2. Audit all dependencies with `npm audit`.

Pages configuration and DNS steps are in [DEPLOYMENT.md](docs/DEPLOYMENT.md). Hosting stays on GitHub Pages. Production is only verified after the actual domain responds with the built application.

## Limits

40 local assessments; 1,000 capabilities and 100 domains per assessment; 100 groups per domain; 100 criteria per capability; 30 snapshots; 2–10 maturity levels; 10 MB project imports; 16,000 encoded fragment characters. Oversized links use complete JSON files instead. Browser memory and Office applications may limit unusually large reports. Local workspace editing is intended for one active tab; simultaneous tabs do not merge changes.

The standalone offline edition is intended for modern desktop browsers on Windows, macOS and Linux. It may not execute in mobile file previewers. Browser file storage behavior varies, so keep JSON backups. Accessibility targets WCAG 2.2 AA and includes automated and keyboard checks; this is not an independent certification.

## Complete sample assessments

Choose **New assessment → Complete sample assessment** to load one of six fictional scenarios: Power Platform governance, organisational growth readiness, Azure landing-zone readiness, safer DevOps releases, cybersecurity governance and enterprise architecture portfolio alignment. Samples contain current/target scores, capability-specific observations, risks, actions, owners, priorities, due dates and two historical snapshots. Each is added as a separate editable project. Framework templates remain unscored starting points.

The cybersecurity sample includes an unassessed detection capability. Cloud, DevOps and cybersecurity demonstrate weighting; priorities reflect business context rather than numeric gap alone. Samples work in the offline edition too. Download **all sample projects (ZIP)** from the welcome dialog for complete JSON projects and capability CSV files; the ZIP is also published at `maturity-samples.zip`. The examples are fictional and do not claim certification or compliance.
