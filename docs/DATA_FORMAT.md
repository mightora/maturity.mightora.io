# Project format and validation

Complete JSON uses `schemaVersion: 2` and a stable assessment `id`. It includes title, organisation, description, assessment/review dates, owner, assessmentVersion, framework, weighted flag, theme, levels, domains, capabilities and snapshots.

Maturity levels have consecutive integer values from 1, editable names/descriptions/hex colours, guidance and evidence requirements. A scale has 2–10 levels. A capability current or target score is an integer in that scale, `null` for Not assessed, or `"NA"` for Not applicable. Missing and inapplicable states never become zero.

Domains own optional groups. Capabilities reference `domainId` and optional `groupId`, with stable IDs independent of names and ordering. Each capability records name, description, current, target, priority, positive weight, evidence, recommendations, risks, owner, due date, notes and criteria. A criterion has its own stable ID, text, a met boolean and evidence. Criteria inform the capability judgement; they do not calculate the score.

Each snapshot stores `id`, `label`, `date` and an independent `assessment` body, including the original metadata, theme, levels, domains and capabilities. Snapshots do not recursively contain snapshots. Matching capability IDs support trends even after a rename or reorder. Removed capabilities remain in historical copies. Duplicates get new capability and criterion IDs.

Validation rejects invalid shapes, duplicate IDs, unknown domain/group references, nonconsecutive scales, scores outside a scale, invalid priority/weights/dates and exceeded limits. JSON parsing rejects prototype-related keys. UI and file imports apply only validated projects. Legacy version 1 files migrate from the earlier domain-name/5-level format while retaining capability IDs, evidence and improvement actions.

CSV contains Domain and Group labels plus every capability field. Criteria are JSON in a quoted cell. CSV is not a complete backup: framework settings, metadata, themes and historical snapshots are excluded. CSV editing inside an assessment keeps its non-tabular settings and snapshots. File import adds a separate project. Retain IDs when doing a CSV round trip. Formula-like values receive an apostrophe for spreadsheet safety, which the importer removes.

A local workspace groups projects under `version: 2`, `activeId`, `projects` and an optional `updatedAt` timestamp. IndexedDB is primary; browser storage is a fallback and can preserve the newest state during page exit. This is not a synchronised or secure backup, and concurrent editing in multiple tabs does not merge changes.

Sharing uses `#/{view|edit|embed|summary}/{base64url-gzip}`. The fragment carries the project snapshot. It is encoded, not encrypted or access-controlled. Input length and decompressed byte limits are enforced. Read-only and embed sessions do not load or write the workspace. Explicit editable sessions stay temporary until saved as a new local assessment.

Earlier CSV files with ID, Domain, Capability, Current, Target, Priority, Owner, Evidence and Actions columns are also accepted. Column aliases migrate into the current contract without discarding stable capability IDs or existing evidence.
