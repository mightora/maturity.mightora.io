# Verification and publication status

Verified on 20 October 2026. This document separates application checks from remote publication.

## Implemented and checked

- Static browser application, built from TypeScript with esbuild. No runtime backend or API keys.
- Six maturity visualisations, configurable scales, weighted scoring, independent Not assessed / Not applicable states, hierarchy, criteria, metadata and historical snapshots.
- Six illustrative templates and the complete Power Platform governance and engineering example.
- Local IndexedDB workspace with autosave, manual saving, multiple assessments, duplication, undo/redo, reset, clearing and portable JSON.
- Complete JSON round trips, legacy version 1 JSON/CSV migration, quoted/Unicode CSV handling and validation failures.
- Read-only, summary, embed and explicit editable shares, with unchanged local drafts and bounded fragment decoding.
- Native editable PowerPoint radar and bar charts, embedded XLSX data, editable text/tables and detailed capability content. Missing values remain blank.
- Native editable Word content, score tables, evidence, recommendations, roadmap, header/footer, cached section contents plus an updatable native TOC field. Word's editable comparison tables are explicitly described as the alternative to an editable radar.
- Standalone file-URL offline operation, all core editing/visualisation/import/export features, local saving and zero HTTP application requests in the tested workflows.
- Full official Mightora logo, shared header/author/footer, footer YAML snapshot/workaround, measured sticky offsets and a functioning mobile menu.
- Responsive desktop/mobile layout, keyboard chart interaction, accessible data representation and automated WCAG checks through axe.
- SVG, 2400px PNG, printable view, offline ZIP byte matching, and sample Office packages.

## Automated evidence

| Check | Result |
| --- | --- |
| Strict TypeScript checks | Passed |
| Engine, transfer, security-boundary, visualisation, Office and offline-package unit tests | 24 passed |
| Playwright Chromium desktop and 390px mobile suite | 34 passed |
| axe WCAG rule checks within the browser suite | Passed on both viewports |
| Actual file-URL offline browser tests | Passed, including reload, local save and Office downloads; zero HTTP requests |
| npm audit, including development dependencies | Zero known vulnerabilities at the checked lockfile |
| Workflow YAML parsing and required fields | Passed |
| PowerPoint package integrity | Passed with no findings |
| PowerPoint layout geometry and heading fit | Passed with no findings or warnings |
| DOCX/PPTX ZIP checksums and XML well-formedness | Passed for the representative sample files |
| Representative LibreOffice opening/rendering | Both report types opened and rendered |

Browser environment: Linux with Chromium 153.0.8010.0 and Playwright 1.62.1. Tests cover desktop (1440 × 1000) and mobile (390 × 844) layouts. Firefox/WebKit downloads were attempted but the available download path returned invalid archives, so those engines are not claimed as tested. Windows, macOS and Microsoft Office desktop were not available for execution. The standalone file uses portable browser APIs; direct desktop-browser testing on those operating systems remains an additional compatibility check.

Office editability evidence is based on real ZIP/OOXML structures, chart caches and embedded workbooks, not merely successful downloads. Package validation also removed surplus slide-master content-type entries emitted by the upstream PowerPoint library. LibreOffice rendering is an opening/layout check; it does not establish exact Microsoft Office rendering. All sample Word pages and presentation slides were visually reviewed. Update the Word TOC field to populate current page numbers in Word.

## Remote publication remains blocked

The GitHub connector returned 404 for `mightora/maturity.mightora.io`. The connected capability set can inspect and modify accessible repositories but does not provide repository creation or initial Pages administration. No authenticated GitHub CLI credential was available. No remote push, CodeQL execution, Actions run or production deployment is claimed.

Cloudflare access was available. DNS inspection confirmed that `maturity.mightora.io` has no existing record. DNS awaits the controlled repository and configured Pages custom domain. No hosting migration or unrelated DNS changes were made.

A maintainer must create/enable the repository and select Settings → Pages → GitHub Actions. The prepared source can then be committed without rewriting existing history. Custom-domain/DNS/HTTPS steps are in [DEPLOYMENT.md](DEPLOYMENT.md). The intended website is https://maturity.mightora.io. It has not been verified as a deployed production application.

The application includes links to its real intended repository/workflow resources. Workflow badge statuses will only be meaningful once that repository and its first runs exist. CodeQL configuration and dependency scanning workflows are implemented, but a configured workflow is not evidence of a successful remote scan.

## Remaining limitations

- Word uses genuinely editable comparison tables rather than a native editable radar. PowerPoint supplies the native editable radar and embedded chart data.
- Shared links are encoded snapshots with no encryption or access control. Large links require a project file.
- Browser storage is local to a profile/origin and subject to quotas/clearing; it is not a secure or synchronised backup. Concurrent tabs do not merge edits.
- Very large reports can consume significant browser memory. Limits and explicit chart pagination are documented in the user guide.
- The offline double-click edition targets desktop browsers. Mobile file previewers may not execute it fully.
- Accessibility and dependency checks are useful evidence, not independent certification or a guarantee of absence of defects.
