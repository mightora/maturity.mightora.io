# Security and privacy

This static app processes assessment data locally. It has no authentication, server, telemetry, remote AI, application API or analytics. Document generation, imports and scoring run in the browser. Do not treat browser storage, share fragments or editable Office documents as encrypted storage.

## Input boundaries

JSON is size-limited and validated before application. Prototype-related keys, duplicate IDs, invalid references, invalid scores, malformed dates and excessive structures are rejected. CSV has strict quoted-value handling, row/header checks and spreadsheet formula protection. Share fragments have encoded-size and streamed decompressed-size limits. Imported names, evidence and notes are escaped before HTML and SVG rendering. Assessment text is passed to Office libraries as native text, not HTML.

User evidence URLs remain text and are never fetched. Assessment content is never used as a request URL, query parameter, log entry or analytics payload. Status/error notices report validation errors locally. There are no import HTML handlers or remote media imports.

## Browser persistence

IndexedDB stores the local workspace, with browser storage as a fallback. Page exit can preserve the newest state using a timestamp; storage quotas and browser rules can still prevent saving. Storage is readable by other scripts on the same origin and by users of the same browser profile. Export complete JSON backups. The app does not merge simultaneous edits from multiple tabs.

Shared read-only and embed views use temporary data and leave the workspace untouched. Editable shared views save only after explicit selection of Save as new local assessment. Anyone possessing a share link can inspect it. The URL fragment is not sent as part of ordinary HTTP navigation but can exist in browser history, clipboard, extensions or screenshots. Summary sharing removes specified fields; it is not automatic confidentiality classification.

## Content Security Policy and network

The online CSP permits local scripts and the prescribed Mightora component CDN, restricts connection destinations, denies objects and form actions, and permits remote static branding/badge images. The online edition consequently has a trusted CDN supply-chain boundary. Maintainers should review changes to the shared component feed. The local snapshot provides a fallback, not an integrity guarantee for the live CDN.

Offline CSP allows only the SHA-256-approved application script, local inline styles, data/blob images and embedded fonts, with `connect-src 'none'`, no forms, objects, media or workers. There are no remote script/style/image references used by the offline UI. Ordinary external anchors can navigate only when selected. Browser extensions and the browser itself are outside this app’s control; use Developer Tools to verify requests independently.

## Verification and dependencies

CI includes strict TypeScript checking, engine/import/injection/share tests, actual Office ZIP/OOXML checks, Playwright desktop/mobile and file-URL offline tests, axe accessibility checks, npm audit, CodeQL and Dependabot. Native PowerPoint charts use embedded XLSX data. Missing states produce blank workbook cells and sparse chart caches rather than zeros. The transitive image-size package is overridden to patched 2.0.4 and js-yaml uses patched 4.3.2.

A clean scan is evidence about the checked versions and rules, not proof of absence of vulnerabilities or a security certification. Report private assessment data through an appropriate private channel rather than a public GitHub issue. Public implementation defects can be reported through the source repository once available. See `docs/VERIFICATION.md` for tested and untested boundaries.
