import {
  blank,
  capability,
  clone,
  uid,
  today,
  LIMITS,
  html,
  fmt,
  numeric,
  gap,
  scoreText,
  filename,
  domainName,
  groupName,
  DEFAULT_THEME,
  type Assessment,
  type Capability,
  type Score,
  type Workspace,
  type Criterion,
} from "./model.ts";
import {
  validate,
  parseProject,
  stats,
  History,
  snapshot,
  improvements,
  methodology,
} from "./engine.ts";
import { template, TEMPLATE_DEFINITIONS } from "./templates.ts";
import { SAMPLE_OPTIONS, sampleAssessment } from "./examples.ts";
import { loadWorkspace, saveWorkspace, clearWorkspace } from "./storage.ts";
import {
  exportCsv,
  importCsv,
  shareLink,
  readShare,
  embedCode,
} from "./transfer.ts";
import { renderChart, type View, type ViewOptions } from "./visuals.ts";
import {
  buildDocx,
  buildPptx,
  saveFile,
  pngFromSvg,
  DEFAULT_REPORT,
  REPORT_THEMES,
  type ReportOptions,
} from "./exports.ts";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const input = (id: string) => $(id) as HTMLInputElement;
const select = (id: string) => $(id) as HTMLSelectElement;
const dialog = (id: string) => $(id) as HTMLDialogElement;
let workspace: Workspace = { version: 2, activeId: "", projects: [] },
  history = new History(blank()),
  shared = false,
  readOnly = false,
  activeDetail: Capability | null = null,
  selected = new Set<string>(),
  rowPage = 0,
  chartPage = 0,
  chartPages = 1,
  currentSvg = "",
  view: View = "executive",
  saveTimer: ReturnType<typeof setTimeout>,
  toastTimer: ReturnType<typeof setTimeout>,
  saveQueue = Promise.resolve(),
  saveGeneration = 0;
const assessment = () => history.value;
function notify(message: string) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 6500);
}
function errorText(e: unknown) {
  return e instanceof Error
    ? e.message
    : "The operation could not be completed.";
}
function fail(e: unknown) {
  notify(errorText(e));
}
function scheduleSave() {
  if (shared) return;
  workspace.updatedAt = Date.now();
  clearTimeout(saveTimer);
  $("saveState").textContent = "Saving changes…";
  const generation = ++saveGeneration;
  saveTimer = setTimeout(() => {
    if (generation === saveGeneration) void persist();
  }, 350);
}
async function persist() {
  if (shared) return;
  const value = clone(workspace);
  saveQueue = saveQueue.then(async () => {
    try {
      $("saveState").textContent = await saveWorkspace(value);
    } catch {
      $("saveState").textContent =
        "Storage unavailable. Export JSON to save your work.";
      notify("Autosave could not complete. Download a complete JSON backup.");
    }
  });
  await saveQueue;
}
function putProject() {
  const p = assessment();
  const index = workspace.projects.findIndex((v) => v.id === p.id);
  if (index >= 0) workspace.projects[index] = clone(p);
}
function update(mutator: (a: Assessment) => void) {
  if (readOnly) return;
  try {
    const a = clone(assessment());
    mutator(a);
    const next = validate(a);
    history.commit(next);
    if (!shared && !workspace.projects.some((p) => p.id === next.id)) {
      workspace.projects.push(next);
      workspace.activeId = next.id;
    }
    putProject();
    render();
    scheduleSave();
  } catch (e) {
    fail(e);
    render();
  }
}
function replaceProject(a: Assessment) {
  if (readOnly) return;
  history.commit(validate(a));
  putProject();
  selected.clear();
  rowPage = 0;
  chartPage = 0;
  render();
  scheduleSave();
}
function addProject(a: Assessment) {
  if (readOnly) return;
  if (workspace.projects.length >= LIMITS.projects)
    return notify(
      "This workspace has 40 assessments. Export and remove an assessment first.",
    );
  a = validate(a);
  workspace.projects.push(a);
  workspace.activeId = a.id;
  history = new History(a);
  shared = false;
  selected.clear();
  rowPage = 0;
  chartPage = 0;
  input("search").value = "";
  select("domainFilter").value = "";
  select("priorityFilter").value = "";
  dialog("welcomeDialog").close();
  render();
  scheduleSave();
  notify("Assessment added to your local workspace.");
}
function filtered() {
  const q = input("search").value.toLowerCase(),
    domain = select("domainFilter").value,
    priority = select("priorityFilter").value;
  return assessment().capabilities.filter(
    (c) =>
      (!domain || c.domainId === domain) &&
      (!priority || c.priority === priority) &&
      (!q ||
        [
          c.name,
          c.description,
          c.owner,
          c.evidence,
          c.recommendations,
          c.risks,
          c.notes,
          domainName(assessment(), c),
          groupName(assessment(), c),
        ].some((v) => v.toLowerCase().includes(q))),
  );
}
const option = (value: unknown, label: unknown, selected: unknown) =>
  `<option value="${html(value)}" ${value === selected ? "selected" : ""}>${html(label)}</option>`;
function scores(value: Score) {
  return (
    option("", "Not assessed", value === null ? "" : value) +
    option("NA", "Not applicable", value) +
    assessment()
      .levels.map((l) => option(l.value, `${l.value} · ${l.name}`, value))
      .join("")
  );
}
function parseScore(s: string): Score {
  return s === "" ? null : s === "NA" ? "NA" : Number(s);
}
function fillSelect(
  id: string,
  items: { value: string; label: string }[],
  empty?: string,
) {
  const el = select(id),
    old = el.value;
  el.innerHTML =
    (empty !== undefined ? option("", empty, old) : "") +
    items.map((v) => option(v.value, v.label, old)).join("");
  if (items.some((v) => v.value === old)) el.value = old;
}
function render() {
  const a = assessment();
  fillSelect(
    "projectPicker",
    workspace.projects.map((p) => ({ value: p.id, label: p.title })),
  );
  select("projectPicker").value = a.id;
  const metadata: Record<string, string> = {
    projectTitle: a.title,
    organisation: a.organisation,
    description: a.description,
    assessmentOwner: a.owner,
    assessmentDate: a.date,
    assessmentVersion: a.assessmentVersion,
    reviewDate: a.reviewDate,
    frameworkName: a.framework,
  };
  for (const [key, value] of Object.entries(metadata)) {
    input(key).value = value;
    input(key).disabled = readOnly;
  }
  fillSelect(
    "domainFilter",
    a.domains.map((d) => ({ value: d.id, label: d.name })),
    "All domains",
  );
  const s = stats(a, filtered());
  $("metrics").innerHTML = [
    ["Current maturity", fmt(s.current), `out of ${a.levels.length}`],
    ["Target maturity", fmt(s.target), `out of ${a.levels.length}`],
    [
      "Assessed",
      `${s.assessed} / ${s.total}`,
      `${s.unassessed} not assessed, ${s.notApplicable} N/A`,
    ],
    ["Require attention", s.attention, "Risk or priority gap"],
    ["Paired average gap", fmt(s.gap), "Target minus current"],
  ]
    .map(
      ([label, value, note]) =>
        `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`,
    )
    .join("");
  fillSelect(
    "domainFilter",
    a.domains.map((d) => ({ value: d.id, label: d.name })),
    "All domains",
  );
  input("weighted").checked = a.weighted;
  ($("undo") as HTMLButtonElement).disabled = !history.past.length;
  ($("redo") as HTMLButtonElement).disabled = !history.future.length;
  renderEditor();
  renderFramework();
  renderSnapshots();
  renderTheme();
  renderVisuals();
  if (select("editorMode").value !== "visual") renderSource();
}
function renderEditor() {
  const a = assessment(),
    items = filtered(),
    pages = Math.max(1, Math.ceil(items.length / 40));
  rowPage = Math.min(rowPage, pages - 1);
  const rows = items.slice(rowPage * 40, (rowPage + 1) * 40);
  $("capabilityRows").innerHTML = rows.length
    ? rows
        .map(
          (c) =>
            `<tr data-id="${html(c.id)}"><td><input type="checkbox" data-select="${html(c.id)}" aria-label="Select ${html(c.name)}" ${selected.has(c.id) ? "checked" : ""} ${readOnly ? "disabled" : ""}></td><td><input data-field="name" value="${html(c.name)}" maxlength="240" aria-label="Capability name for ${html(c.name)}" ${readOnly ? "disabled" : ""}><small>${html(domainName(a, c))}${c.groupId ? " / " + html(groupName(a, c)) : ""}</small></td><td><select data-field="current" aria-label="Current maturity for ${html(c.name)}" ${readOnly ? "disabled" : ""}>${scores(c.current)}</select></td><td><select data-field="target" aria-label="Target maturity for ${html(c.name)}" ${readOnly ? "disabled" : ""}>${scores(c.target)}</select></td><td>${gap(c) ?? "—"}</td><td><select data-field="priority" aria-label="Priority for ${html(c.name)}" ${readOnly ? "disabled" : ""}>${["High", "Medium", "Low"].map((p) => option(p, p, c.priority)).join("")}</select></td><td><input data-field="owner" value="${html(c.owner)}" maxlength="160" aria-label="Owner for ${html(c.name)}" ${readOnly ? "disabled" : ""}></td><td><div class="row-buttons"><button data-row="details" class="btn" aria-label="Details for ${html(c.name)}">Details</button>${readOnly ? "" : `<button data-row="copy" class="btn" aria-label="Duplicate ${html(c.name)}">Copy</button><button data-row="up" class="btn" aria-label="Move ${html(c.name)} up">↑</button><button data-row="down" class="btn" aria-label="Move ${html(c.name)} down">↓</button><button data-row="delete" class="btn danger" aria-label="Delete ${html(c.name)}">Delete</button>`}</div></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="8"><p class="empty">No capabilities to show. Add a capability, choose an example or reset the filters.</p></td></tr>';
  $("editorStatus").textContent =
    `${items.length} of ${a.capabilities.length} capabilities match the filters. Scores update the charts immediately.`;
  $("rowsPage").textContent = `Page ${rowPage + 1} of ${pages}`;
  ($("rowsPrev") as HTMLButtonElement).disabled = rowPage === 0;
  ($("rowsNext") as HTMLButtonElement).disabled = rowPage === pages - 1;
  $("selectedCount").textContent = `${selected.size} selected`;
  input("selectAll").checked =
    rows.length > 0 && rows.every((c) => selected.has(c.id));
}
function renderVisuals() {
  const a = assessment();
  const previous = select("previousSnapshot").value;
  fillSelect(
    "previousSnapshot",
    a.snapshots.map((s) => ({ value: s.id, label: `${s.date} ${s.label}` })),
  );
  if (previous) select("previousSnapshot").value = previous;
  else if (a.snapshots.length)
    select("previousSnapshot").value = a.snapshots.at(-1)!.id;
  fillSelect(
    "historyScope",
    [
      ...a.domains.map((d) => ({ value: d.id, label: `Domain: ${d.name}` })),
      ...a.capabilities.map((c) => ({
        value: "cap:" + c.id,
        label: `Capability: ${c.name}`,
      })),
    ],
    "Overall assessment",
  );
  const opts: ViewOptions = {
    view,
    items: filtered(),
    measure: select("measure").value as ViewOptions["measure"],
    current: input("showCurrent").checked,
    target: input("showTarget").checked,
    previous: input("showPrevious").checked,
    previousSnapshot: a.snapshots.find(
      (s) => s.id === select("previousSnapshot").value,
    ),
    page: chartPage,
    labelSize: Number(input("labelSize").value),
    historyScope: select("historyScope").value,
    sort: select("gapSort").value,
  };
  const chart = renderChart(a, opts);
  currentSvg = chart.svg;
  chartPages = chart.pages;
  chartPage = Math.min(chartPage, chartPages - 1);
  $("chartArea").innerHTML = currentSvg;
  const svg = $("chartArea").querySelector("svg");
  if (svg) svg.style.width = select("chartZoom").value + "%";
  $("chartNote").textContent = chart.note;
  $("chartPage").textContent = `Chart page ${chartPage + 1} of ${chartPages}`;
  ($("chartPrev") as HTMLButtonElement).disabled = chartPage === 0;
  ($("chartNext") as HTMLButtonElement).disabled = chartPage === chartPages - 1;
  document
    .querySelectorAll("[data-view]")
    .forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String((el as HTMLElement).dataset.view === view),
      ),
    );
  const shown = filtered(),
    s = stats(a, shown),
    largest = improvements(
      shown.filter((c) => (gap(c) ?? 0) > 0),
      "gap",
    ).slice(0, 3);
  $("executiveSummary").hidden = view !== "executive";
  $("executiveSummary").textContent =
    `${s.assessed} of ${s.total} filtered capabilities assessed. ${s.attention} require attention. Largest numeric gaps: ${largest.map((c) => `${c.name} (+${gap(c)})`).join("; ") || "none with paired numeric scores"}. The largest gap does not automatically imply the highest business priority.`;
  $("scoreData").innerHTML = shown
    .map(
      (c) =>
        `<tr><td>${html(domainName(a, c))}</td><th scope="row">${html(c.name)}</th><td>${html(scoreText(c.current, a))}</td><td>${html(scoreText(c.target, a))}</td><td>${gap(c) ?? "Unpaired"}</td><td>${html(c.owner)}</td><td>${html(c.due)}</td></tr>`,
    )
    .join("");
  const relevant: Record<string, boolean> = {
    measure: view === "heatmap",
    showCurrent: view === "radar",
    showTarget: view === "radar",
    showPrevious: view === "radar",
    previousSnapshot: view === "radar",
    labelSize: view === "radar",
    gapSort: view === "gap",
    historyScope: view === "history",
  };
  Object.entries(relevant).forEach(([id, visible]) => {
    $(id).closest("label")!.toggleAttribute("hidden", !visible);
  });
}
function renderFramework() {
  const a = assessment();
  $("methodology").textContent = methodology(a);
  $("levelSettings").innerHTML = a.levels
    .map(
      (l, i) =>
        `<article class="level-card" data-level="${i}"><h3>Level ${l.value}</h3><div class="form-grid"><label>Colour<input data-level-field="color" type="color" value="${l.color}"></label><label>Name<input data-level-field="name" maxlength="60" value="${html(l.name)}" required></label><label class="full">Description<textarea data-level-field="description" maxlength="4000">${html(l.description)}</textarea></label><label class="full">Scoring guidance<textarea data-level-field="guidance" maxlength="4000">${html(l.guidance)}</textarea></label><label class="full">Evidence requirements<textarea data-level-field="evidence" maxlength="4000">${html(l.evidence)}</textarea></label></div>${i === a.levels.length - 1 ? '<button class="btn danger" data-level-remove="true">Remove last maturity level</button>' : ""}</article>`,
    )
    .join("");
  $("domainEditor").innerHTML =
    a.domains
      .map(
        (d) =>
          `<article class="domain-edit" data-domain="${html(d.id)}"><div class="domain-heading"><label>Domain name<input data-domain-field="name" maxlength="160" value="${html(d.name)}" required></label><small>ID: ${html(d.id)}</small></div><label>Description<textarea data-domain-field="description" maxlength="4000">${html(d.description)}</textarea></label><div class="inline-actions"><button class="btn" data-domain-action="up">Move up</button><button class="btn" data-domain-action="down">Move down</button><button class="btn" data-domain-action="copy">Duplicate with capabilities</button><button class="btn danger" data-domain-action="delete">Delete domain and capabilities</button><button class="btn" data-domain-action="group">+ Capability group</button></div>${d.groups.map((g) => `<div class="group-row" data-group="${html(g.id)}"><label>Capability group<input data-group-name value="${html(g.name)}" maxlength="160" required></label><button class="btn danger" data-group-delete aria-label="Remove group ${html(g.name)}">Remove group</button></div>`).join("")}</article>`,
      )
      .join("") ||
    '<p class="empty">Create a domain to organise your capabilities. A domain can contain optional capability groups.</p>';
}
function renderSnapshots() {
  const a = assessment();
  $("snapshotList").innerHTML = a.snapshots.length
    ? a.snapshots
        .map(
          (s) =>
            `<article class="snapshot-card"><div><strong>${html(s.label)}</strong><p>${s.date} · ${s.assessment.capabilities.length} capabilities · Current ${fmt(stats(s.assessment).current)} / ${s.assessment.levels.length}</p></div><div class="toolbar-group"><button class="btn" data-snapshot-copy="${html(s.id)}">Open as new assessment</button><button class="btn danger" data-snapshot-delete="${html(s.id)}">Remove snapshot</button></div></article>`,
        )
        .join("")
    : '<p class="empty">No snapshots yet. Capture a baseline before making changes.</p>';
}
function renderTheme() {
  const a = assessment();
  select("appTheme").value = a.theme.preset;
  input("currentColor").value = a.theme.current;
  input("targetColor").value = a.theme.target;
  input("previousColor").value = a.theme.previous;
  input("labelSize").value = String(a.theme.labelSize);
}
function renderSource() {
  const mode = select("editorMode").value;
  $("visualEditor").hidden = mode !== "visual";
  $("structuredEditor").hidden = mode === "visual";
  input("structuredSource").value =
    mode === "csv"
      ? exportCsv(assessment())
      : JSON.stringify(assessment(), null, 2);
  input("structuredSource").readOnly = readOnly;
  $("structuredHelp").textContent =
    mode === "csv"
      ? "CSV replaces the capability rows in this assessment while retaining framework settings, metadata and snapshots. It is not a complete backup. Use exported columns and stable IDs."
      : "JSON preserves the complete project, including maturity levels, domains, groups, criteria, metadata, themes and historical snapshots.";
  $("sourceErrors").textContent = "";
}
function openDetails(id: string) {
  const c = assessment().capabilities.find((v) => v.id === id);
  if (!c) return;
  activeDetail = clone(c);
  renderDetails();
  dialog("detailsDialog").showModal();
}
function detailField(
  label: string,
  name: keyof Capability,
  value: string,
  type = "text",
  max = 10000,
) {
  return `<label>${html(label)}${type === "textarea" ? `<textarea name="${name}" maxlength="${max}" rows="3" ${readOnly ? "readonly" : ""}>${html(value)}</textarea>` : `<input name="${name}" type="${type}" value="${html(value)}" maxlength="${max}" ${["name", "weight"].includes(name) ? "required" : ""} ${readOnly ? "readonly" : ""} ${type === "number" ? 'min="0.01" max="1000" step="0.01"' : ""}>`}</label>`;
}
function renderDetails() {
  const c = activeDetail!,
    a = assessment();
  const d = a.domains.find((v) => v.id === c.domainId);
  $("detailTitle").textContent = readOnly
    ? "Capability evidence"
    : "Capability details";
  $("detailError").textContent = "";
  $("detailFields").innerHTML =
    detailField("Capability name", "name", c.name, "text", 240) +
    `<div class="form-grid"><label>Domain<select name="domainId" ${readOnly ? "disabled" : ""}>${a.domains.map((d) => option(d.id, d.name, c.domainId)).join("")}</select></label><label>Capability group<select name="groupId" ${readOnly ? "disabled" : ""}>${option("", "Ungrouped", c.groupId)}${(d?.groups ?? []).map((g) => option(g.id, g.name, c.groupId)).join("")}</select></label><label>Current maturity<select name="current" ${readOnly ? "disabled" : ""}>${scores(c.current)}</select></label><label>Target maturity<select name="target" ${readOnly ? "disabled" : ""}>${scores(c.target)}</select></label><label>Priority<select name="priority" ${readOnly ? "disabled" : ""}>${["High", "Medium", "Low"].map((p) => option(p, p, c.priority)).join("")}</select></label>${detailField("Capability weight", "weight", String(c.weight), "number")}${detailField("Responsible owner", "owner", c.owner, "text", 160)}${detailField("Target completion date", "due", c.due, "date")}</div>` +
    detailField("Description", "description", c.description, "textarea", 4000) +
    detailField(
      "Evidence and justification",
      "evidence",
      c.evidence,
      "textarea",
    ) +
    detailField(
      "Recommendations",
      "recommendations",
      c.recommendations,
      "textarea",
    ) +
    detailField("Risks and issues", "risks", c.risks, "textarea") +
    detailField("Supporting notes", "notes", c.notes, "textarea") +
    `<p class="note">Stable identifier: ${html(c.id)}</p>`;
  renderCriteria();
}
function captureDetails() {
  if (!activeDetail) return;
  const form = $("capabilityForm") as HTMLFormElement;
  const data = new FormData(form);
  for (const key of [
    "name",
    "domainId",
    "groupId",
    "description",
    "owner",
    "due",
    "evidence",
    "recommendations",
    "risks",
    "notes",
    "priority",
  ] as const) {
    const v = data.get(key);
    if (v !== null) (activeDetail as any)[key] = String(v);
  }
  for (const key of ["current", "target"] as const) {
    const v = data.get(key);
    if (v !== null) activeDetail[key] = parseScore(String(v));
  }
  activeDetail.weight = Number(data.get("weight"));
  document.querySelectorAll<HTMLElement>(".criteria-row").forEach((row) => {
    const r = activeDetail!.criteria.find(
      (r) => r.id === row.dataset.criterion,
    );
    if (!r) return;
    r.text = row.querySelector<HTMLTextAreaElement>(
      "[data-criterion-text]",
    )!.value;
    r.evidence = row.querySelector<HTMLTextAreaElement>(
      "[data-criterion-evidence]",
    )!.value;
    r.met = row.querySelector<HTMLInputElement>(
      "[data-criterion-met]",
    )!.checked;
  });
}
function renderCriteria() {
  $("criteriaEditor").innerHTML = activeDetail!.criteria
    .map(
      (r) =>
        `<div class="criteria-row" data-criterion="${html(r.id)}"><label>Criterion<textarea data-criterion-text maxlength="1000" ${readOnly ? "readonly" : ""}>${html(r.text)}</textarea></label><label class="check"><input data-criterion-met type="checkbox" ${r.met ? "checked" : ""} ${readOnly ? "disabled" : ""}> Criterion met</label><label>Criterion evidence<textarea data-criterion-evidence maxlength="4000" ${readOnly ? "readonly" : ""}>${html(r.evidence)}</textarea></label>${readOnly ? "" : '<button type="button" class="btn danger" data-remove-criterion>Remove criterion</button>'}</div>`,
    )
    .join("");
}
function move<T>(values: T[], index: number, offset: number) {
  const dest = index + offset;
  if (dest >= 0 && dest < values.length)
    [values[index], values[dest]] = [values[dest], values[index]];
}
function copyCapability(
  c: Capability,
  domainId = c.domainId,
  groupId = c.groupId,
) {
  return {
    ...clone(c),
    id: uid(),
    domainId,
    groupId,
    criteria: c.criteria.map((r) => ({ ...clone(r), id: uid() })),
  };
}
function reportOptions(): ReportOptions {
  return {
    preset: select("reportTheme").value,
    font: input("reportFont").value.trim() || "Arial",
    aspect: select("reportAspect").value as "wide" | "standard",
    details: input("reportDetails").checked,
    primary: input("reportPrimary").value,
    accent: input("reportAccent").value,
  };
}
function previewReport() {
  const o = reportOptions(),
    t = REPORT_THEMES[o.preset] ?? {
      ink: o.primary.slice(1),
      accent: o.accent.slice(1),
      paper: "FFFFFF",
    },
    el = $("reportPreview");
  el.style.fontFamily = o.font;
  el.style.backgroundColor = "#" + t.paper;
  el.style.color = "#" + t.ink;
  el.style.aspectRatio = o.aspect === "wide" ? "16 / 9" : "4 / 3";
  (el.querySelector("small") as HTMLElement).style.color = "#" + t.accent;
}
async function exportType(type: string) {
  const controls = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-export]"),
  ];
  try {
    controls.forEach((c) => (c.disabled = true));
    notify(`Generating ${type.toUpperCase()} locally…`);
    const a = validate(assessment());
    let result: Blob;
    if (type === "json")
      result = new Blob([JSON.stringify(a, null, 2)], {
        type: "application/json",
      });
    else if (type === "csv")
      result = new Blob([exportCsv(a)], { type: "text/csv;charset=utf-8" });
    else if (type === "pptx") result = await buildPptx(a, reportOptions());
    else if (type === "docx") result = await buildDocx(a, reportOptions());
    else if (type === "svg")
      result = new Blob([currentSvg], { type: "image/svg+xml" });
    else if (type === "png") result = await pngFromSvg(currentSvg);
    else return;
    saveFile(result, filename(a, type));
    notify(`${type.toUpperCase()} exported. Everything was generated locally.`);
  } catch (e) {
    fail(e);
  } finally {
    controls.forEach((c) => (c.disabled = false));
  }
}
async function importFile(file: File | undefined) {
  if (!file || readOnly) return;
  try {
    if (file.size > LIMITS.bytes)
      throw new Error("Maximum import size is 10 MB.");
    const text = await file.text();
    const next = file.name.toLowerCase().endsWith(".csv")
      ? importCsv(text, assessment())
      : parseProject(text);
    next.id = uid();
    addProject(next);
  } catch (e) {
    fail(e);
  } finally {
    input("importFile").value = "";
  }
}
function networkInfo() {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const entries = new Map<string, number>();
  for (const r of resources) {
    try {
      const u = new URL(r.name);
      if (u.protocol === "http:" || u.protocol === "https:")
        entries.set(u.host, (entries.get(u.host) ?? 0) + 1);
    } catch {
      /* Ignore entries without a URL. */
    }
  }
  $("networkStatus").textContent = entries.size
    ? `Observed ${[...entries.values()].reduce((a, b) => a + b, 0)} resource entries: ${[...entries].map(([host, n]) => `${host} (${n})`).join(", ")}.`
    : "No HTTP resource entries are currently visible to the Performance API. This alone does not prove that no network activity occurred.";
}
function measureHeader() {
  const head = document.querySelector("mightora-header,.offline-header");
  if (head)
    document.documentElement.style.setProperty(
      "--header-height",
      `${Math.ceil(head.getBoundingClientRect().height)}px`,
    );
}
function bind() {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement,
      b = target.closest<HTMLElement>("[data-close]");
    if (b) dialog(b.dataset.close!).close();
    const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (shared && link) {
      e.preventDefault();
      const id = link.getAttribute("href")!.slice(1);
      document.getElementById(id)?.scrollIntoView();
    }
  });
  window.addEventListener("hashchange", (e) => {
    const old = new URL(e.oldURL).hash;
    if (location.hash.startsWith("#/") || (old.startsWith("#/") && shared))
      location.reload();
  });
  $("newProject").onclick = () => dialog("welcomeDialog").showModal();
  $("startBlank").onclick = () => addProject(blank());
  $("loadExample").onclick = () => addProject(sampleAssessment("power"));
  $("useSample").onclick = () =>
    addProject(sampleAssessment(select("samplePicker").value));
  $("useTemplate").onclick = () =>
    addProject(template(select("templatePicker").value));
  $("importButton").onclick = $("welcomeImport").onclick = () =>
    input("importFile").click();
  input("importFile").onchange = () =>
    void importFile(input("importFile").files?.[0]);
  $("manualSave").onclick = () => void persist();
  select("projectPicker").onchange = () => {
    const p = workspace.projects.find(
      (p) => p.id === select("projectPicker").value,
    );
    if (p) {
      history = new History(clone(p));
      workspace.activeId = p.id;
      selected.clear();
      rowPage = 0;
      chartPage = 0;
      render();
      scheduleSave();
    }
  };
  $("duplicateProject").onclick = () => {
    const a = clone(assessment());
    a.id = uid();
    a.title = (a.title + " copy").slice(0, 200);
    addProject(a);
  };
  $("deleteProject").onclick = () => {
    if (
      !confirm(
        `Delete “${assessment().title}” from this browser? Export JSON first if you need a backup.`,
      )
    )
      return;
    workspace.projects = workspace.projects.filter(
      (p) => p.id !== assessment().id,
    );
    const next = workspace.projects[0];
    workspace.activeId = next?.id ?? "";
    history = new History(next ?? blank());
    selected.clear();
    render();
    scheduleSave();
    if (!next) dialog("welcomeDialog").showModal();
  };
  const fields: Record<string, keyof Assessment> = {
    projectTitle: "title",
    organisation: "organisation",
    description: "description",
    assessmentOwner: "owner",
    assessmentDate: "date",
    assessmentVersion: "assessmentVersion",
    reviewDate: "reviewDate",
    frameworkName: "framework",
  };
  for (const [id, key] of Object.entries(fields))
    input(id).onchange = () =>
      update((a) => ((a as any)[key] = input(id).value));
  $("undo").onclick = () => {
    if (readOnly) return;
    history.undo();
    putProject();
    render();
    scheduleSave();
  };
  $("redo").onclick = () => {
    if (readOnly) return;
    history.redo();
    putProject();
    render();
    scheduleSave();
  };
  $("addCapability").onclick = () => {
    if (assessment().capabilities.length >= LIMITS.capabilities)
      return notify("Maximum 1,000 capabilities per assessment.");
    let cap: Capability;
    update((a) => {
      let domain =
        a.domains.find((d) => d.id === select("domainFilter").value) ||
        a.domains[0];
      if (!domain) {
        domain = { id: uid(), name: "New domain", description: "", groups: [] };
        a.domains.push(domain);
      }
      cap = capability(domain.id);
      a.capabilities.push(cap);
    });
    openDetails(assessment().capabilities.at(-1)!.id);
  };
  $("capabilityRows").onchange = (e) => {
    const el = e.target as HTMLInputElement,
      row = el.closest<HTMLElement>("[data-id]");
    if (!row) return;
    const id = row.dataset.id!;
    if (el.dataset.select) {
      el.checked ? selected.add(id) : selected.delete(id);
      $("selectedCount").textContent = `${selected.size} selected`;
      return;
    }
    const key = el.dataset.field;
    if (
      !key ||
      !["name", "current", "target", "priority", "owner"].includes(key)
    )
      return;
    update((a) => {
      const c = a.capabilities.find((v) => v.id === id)!;
      (c as any)[key] =
        key === "current" || key === "target" ? parseScore(el.value) : el.value;
    });
  };
  $("capabilityRows").onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-row]"),
      id = b?.closest<HTMLElement>("[data-id]")?.dataset.id;
    if (!b || !id) return;
    if (b.dataset.row === "details") return openDetails(id);
    if (readOnly) return;
    const c = assessment().capabilities.find((c) => c.id === id)!;
    if (
      b.dataset.row === "delete" &&
      !confirm(`Delete capability “${c.name}”? You can undo this edit.`)
    )
      return;
    update((a) => {
      const i = a.capabilities.findIndex((c) => c.id === id);
      if (b.dataset.row === "delete") {
        a.capabilities.splice(i, 1);
        selected.delete(id);
      } else if (b.dataset.row === "copy") {
        const copy = copyCapability(c);
        copy.name = (c.name + " copy").slice(0, 240);
        a.capabilities.splice(i + 1, 0, copy);
      } else move(a.capabilities, i, b.dataset.row === "up" ? -1 : 1);
    });
  };
  input("selectAll").onchange = () => {
    const rows = filtered().slice(rowPage * 40, (rowPage + 1) * 40);
    rows.forEach((c) =>
      input("selectAll").checked ? selected.add(c.id) : selected.delete(c.id),
    );
    renderEditor();
  };
  $("applyBulk").onclick = () => {
    const field = select("bulkField").value,
      value = input("bulkValue").value;
    if (!selected.size) return notify("Select one or more capabilities first.");
    update((a) =>
      a.capabilities
        .filter((c) => selected.has(c.id))
        .forEach((c) => {
          if (field === "priority")
            c.priority = value as Capability["priority"];
          else if (field === "owner") c.owner = value;
          else if (field === "target") c.target = parseScore(value);
          else if (field === "domainId") {
            c.domainId = value;
            c.groupId = "";
          }
        }),
    );
  };
  input("search").oninput = () => {
    rowPage = chartPage = 0;
    render();
  };
  select("domainFilter").onchange = select("priorityFilter").onchange = () => {
    rowPage = chartPage = 0;
    render();
  };
  $("resetFilters").onclick = () => {
    input("search").value = "";
    select("domainFilter").value = "";
    select("priorityFilter").value = "";
    rowPage = chartPage = 0;
    render();
  };
  $("rowsPrev").onclick = () => {
    rowPage--;
    renderEditor();
  };
  $("rowsNext").onclick = () => {
    rowPage++;
    renderEditor();
  };
  select("editorMode").onchange = renderSource;
  $("applySource").onclick = () => {
    try {
      const next =
        select("editorMode").value === "csv"
          ? importCsv(input("structuredSource").value, assessment())
          : parseProject(input("structuredSource").value);
      next.id = assessment().id;
      replaceProject(next);
      notify("Validated source applied.");
    } catch (e) {
      $("sourceErrors").textContent = errorText(e);
    }
  };
  $("viewTabs").onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-view]");
    if (b) {
      view = b.dataset.view as View;
      chartPage = 0;
      renderVisuals();
    }
  };
  for (const id of [
    "measure",
    "showCurrent",
    "showTarget",
    "showPrevious",
    "previousSnapshot",
    "chartZoom",
    "gapSort",
    "historyScope",
  ])
    $(id).onchange = () => {
      chartPage = 0;
      renderVisuals();
    };
  input("labelSize").oninput = renderVisuals;
  input("labelSize").onchange = () =>
    update((a) => (a.theme.labelSize = Number(input("labelSize").value)));
  $("chartPrev").onclick = () => {
    chartPage--;
    renderVisuals();
  };
  $("chartNext").onclick = () => {
    chartPage++;
    renderVisuals();
  };
  $("chartArea").onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-cap]");
    if (b) openDetails(b.dataset.cap!);
  };
  $("chartArea").onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cap]");
      if (el) {
        e.preventDefault();
        openDetails(el.dataset.cap!);
      }
    }
  };
  $("addDomain").onclick = () =>
    update((a) =>
      a.domains.push({
        id: uid(),
        name: "New domain",
        description: "",
        groups: [],
      }),
    );
  $("domainEditor").onchange = (e) => {
    const el = e.target as HTMLInputElement,
      did = el.closest<HTMLElement>("[data-domain]")?.dataset.domain;
    if (!did) return;
    update((a) => {
      const d = a.domains.find((d) => d.id === did)!;
      if (
        el.dataset.domainField === "name" ||
        el.dataset.domainField === "description"
      )
        d[el.dataset.domainField] = el.value;
      else if (el.hasAttribute("data-group-name"))
        d.groups.find(
          (g) =>
            g.id === el.closest<HTMLElement>("[data-group]")!.dataset.group,
        )!.name = el.value;
    });
  };
  $("domainEditor").onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-domain-action],[data-group-delete]",
      ),
      id = b?.closest<HTMLElement>("[data-domain]")?.dataset.domain;
    if (!b || !id) return;
    const action = b.dataset.domainAction;
    if (
      action === "delete" &&
      !confirm(
        "Delete this domain and all its capabilities? Snapshots are preserved. This can be undone.",
      )
    )
      return;
    if (
      b.hasAttribute("data-group-delete") &&
      !confirm(
        "Remove this group? Capabilities will remain in the domain as ungrouped.",
      )
    )
      return;
    update((a) => {
      const i = a.domains.findIndex((d) => d.id === id),
        d = a.domains[i];
      if (b.hasAttribute("data-group-delete")) {
        const gid = b.closest<HTMLElement>("[data-group]")!.dataset.group;
        d.groups = d.groups.filter((g) => g.id !== gid);
        a.capabilities.forEach((c) => {
          if (c.groupId === gid) c.groupId = "";
        });
      } else if (action === "delete") {
        a.domains.splice(i, 1);
        a.capabilities = a.capabilities.filter((c) => c.domainId !== id);
      } else if (action === "group")
        d.groups.push({ id: uid(), name: "New capability group" });
      else if (action === "copy") {
        const copy = clone(d);
        copy.id = uid();
        copy.name = (copy.name + " copy").slice(0, 160);
        const ids = new Map(copy.groups.map((g) => [g.id, uid()]));
        copy.groups.forEach((g) => (g.id = ids.get(g.id)!));
        a.domains.splice(i + 1, 0, copy);
        a.capabilities.push(
          ...a.capabilities
            .filter((c) => c.domainId === id)
            .map((c) => copyCapability(c, copy.id, ids.get(c.groupId) || "")),
        );
      } else move(a.domains, i, action === "up" ? -1 : 1);
    });
  };
  $("levelSettings").onchange = (e) => {
    const el = e.target as HTMLInputElement,
      index = Number(el.closest<HTMLElement>("[data-level]")?.dataset.level),
      key = el.dataset.levelField;
    if (
      !["name", "description", "guidance", "evidence", "color"].includes(
        key || "",
      )
    )
      return;
    update((a) => ((a.levels[index] as any)[key!] = el.value));
  };
  $("levelSettings").onclick = (e) => {
    if (!(e.target as HTMLElement).hasAttribute("data-level-remove")) return;
    const a = assessment(),
      last = a.levels.length;
    if (last <= 2) return notify("Keep at least two maturity levels.");
    const used = a.capabilities.some(
      (c) => c.current === last || c.target === last,
    );
    if (
      !confirm(
        `Remove level ${last}? ${used ? "Scores at this level will become Not assessed. " : ""}Historical snapshots keep their original levels.`,
      )
    )
      return;
    update((a) => {
      a.levels.pop();
      a.capabilities.forEach((c) => {
        if (c.current === last) c.current = null;
        if (c.target === last) c.target = null;
      });
    });
  };
  $("addLevel").onclick = () => {
    if (assessment().levels.length >= 10)
      return notify("Maximum 10 maturity levels.");
    update((a) =>
      a.levels.push({
        value: a.levels.length + 1,
        name: "New maturity level",
        description: "",
        guidance: "",
        evidence: "",
        color: "#7D9AA5",
      }),
    );
  };
  input("weighted").onchange = () =>
    update((a) => (a.weighted = input("weighted").checked));
  select("appTheme").onchange = () =>
    update((a) => {
      a.theme.preset = select("appTheme").value;
      const presets: Record<string, string[]> = {
        mightora: ["#1769AA", "#B44D2E", "#7654A3"],
        ocean: ["#005F73", "#9B2226", "#6A4C93"],
        forest: ["#245C42", "#A64B22", "#684F91"],
      };
      const colors = presets[a.theme.preset];
      if (colors) [a.theme.current, a.theme.target, a.theme.previous] = colors;
    });
  for (const [id, key] of [
    ["currentColor", "current"],
    ["targetColor", "target"],
    ["previousColor", "previous"],
  ] as const)
    input(id).onchange = () =>
      update((a) => {
        a.theme.preset = "custom";
        a.theme[key] = input(id).value;
      });
  $("takeSnapshot").onclick = () => {
    if (assessment().snapshots.length >= LIMITS.snapshots)
      return notify(
        "Maximum 30 snapshots. Export the project before removing older snapshots.",
      );
    const label = prompt("Snapshot label", `Review ${today()}`);
    if (label?.trim())
      update((a) => a.snapshots.push(snapshot(a, label.trim())));
  };
  $("snapshotList").onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-snapshot-copy],[data-snapshot-delete]",
    );
    if (!b) return;
    const id = b.dataset.snapshotCopy || b.dataset.snapshotDelete,
      s = assessment().snapshots.find((s) => s.id === id)!;
    if (b.dataset.snapshotCopy) {
      const next: Assessment = {
        ...clone(s.assessment),
        id: uid(),
        schemaVersion: 2,
        snapshots: [],
      };
      next.title = (next.title + " · " + s.label).slice(0, 200);
      addProject(next);
    } else if (
      confirm(
        "Remove this historical snapshot? This can be undone during this session.",
      )
    )
      update((a) => (a.snapshots = a.snapshots.filter((s) => s.id !== id)));
  };
  $("capabilityForm").onsubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    captureDetails();
    try {
      const next = clone(assessment()),
        i = next.capabilities.findIndex((c) => c.id === activeDetail!.id);
      next.capabilities[i] = activeDetail!;
      validate(next);
      replaceProject(next);
      dialog("detailsDialog").close();
    } catch (e) {
      $("detailError").textContent = errorText(e);
    }
  };
  $("detailFields").onchange = (e) => {
    if ((e.target as HTMLSelectElement).name === "domainId") {
      captureDetails();
      activeDetail!.groupId = "";
      renderDetails();
    }
  };
  $("addCriterion").onclick = () => {
    captureDetails();
    activeDetail!.criteria.push({
      id: uid(),
      text: "New assessment criterion",
      met: false,
      evidence: "",
    });
    renderCriteria();
  };
  $("criteriaEditor").onclick = (e) => {
    const b = (e.target as HTMLElement).closest("[data-remove-criterion]");
    if (b) {
      captureDetails();
      const id = b.closest<HTMLElement>("[data-criterion]")!.dataset.criterion;
      activeDetail!.criteria = activeDetail!.criteria.filter(
        (r) => r.id !== id,
      );
      renderCriteria();
    }
  };
  document
    .querySelectorAll<HTMLElement>("[data-export]")
    .forEach((b) => (b.onclick = () => void exportType(b.dataset.export!)));
  $("printButton").onclick = () => {
    document
      .querySelectorAll<HTMLDetailsElement>(".score-data")
      .forEach((d) => (d.open = true));
    window.print();
  };
  for (const id of [
    "reportTheme",
    "reportFont",
    "reportAspect",
    "reportPrimary",
    "reportAccent",
  ])
    $(id).oninput = previewReport;
  $("shareButton").onclick = $("shareExport").onclick = () =>
    dialog("shareDialog").showModal();
  $("generateShare").onclick = async () => {
    try {
      $("shareError").textContent = "";
      const url = await shareLink(
        assessment(),
        select("shareMode").value as "view" | "edit" | "embed" | "summary",
        location.href,
      );
      input("shareUrl").value = url;
      input("embedCode").value =
        select("shareMode").value === "embed"
          ? embedCode(url, assessment().title)
          : "";
    } catch (e) {
      input("shareUrl").value = "";
      input("embedCode").value = "";
      $("shareError").textContent = errorText(e);
    }
  };
  $("copyShare").onclick = async () => {
    try {
      await navigator.clipboard.writeText(input("shareUrl").value);
      notify("Share link copied.");
    } catch {
      input("shareUrl").select();
      notify("Select the link and use your device’s Copy command.");
    }
  };
  $("resetProject").onclick = () => {
    if (
      confirm(
        "Reset this assessment to a blank framework? Export JSON first. This can be undone.",
      )
    ) {
      const next = blank();
      next.id = assessment().id;
      replaceProject(next);
    }
  };
  $("clearLocal").onclick = async () => {
    if (
      !confirm(
        "Permanently clear every locally saved assessment? Download JSON backups first.",
      )
    )
      return;
    clearTimeout(saveTimer);
    saveGeneration++;
    await saveQueue;
    try {
      await clearWorkspace();
      workspace = { version: 2, activeId: "", projects: [] };
      history = new History(blank());
      selected.clear();
      render();
      $("saveState").textContent = "All local assessments cleared";
      dialog("welcomeDialog").showModal();
    } catch (e) {
      fail(e);
    }
  };
  $("refreshNetwork").onclick = networkInfo;
  window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || readOnly) return;
    if ((e.target as HTMLElement).matches("input,textarea,[contenteditable]"))
      return;
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      $("" + (e.shiftKey ? "redo" : "undo")).click();
    }
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      void persist();
    }
  });
  window.addEventListener("pagehide", () => {
    if (!shared) {
      try {
        localStorage.setItem(
          "mightora:maturity:workspace:v2",
          JSON.stringify(workspace),
        );
      } catch {
        /* An explicit JSON export remains available. */
      }
    }
  });
  const head = document.querySelector("mightora-header,.offline-header");
  if (head) new ResizeObserver(measureHeader).observe(head);
  window.addEventListener("resize", measureHeader);
  measureHeader();
  const menu = $("offlineMenu");
  if (menu)
    menu.onclick = () => {
      const open = $("offlineNav").classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
      measureHeader();
    };
  // Shared component enhancements retain its native menu behavior and add keyboard state.
  const fallbackImage = (image: HTMLImageElement) => {
    const candidates: Record<string, string> = {
      "https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png":
        "mightora-logo.png",
      "https://techtweedie.github.io/images/author/ian-tweedie-sq2_hu_a380911c6f4726de.png":
        "ian-tweedie.png",
      "https://raw.githubusercontent.com/TechTweedie/techtweedie.github.io/v2/assets/images/site/main-logo.png":
        "techtweedie.png",
    };
    const local = candidates[image.src];
    if (local && !image.dataset.localFallback) {
      image.dataset.localFallback = "true";
      image.src = local;
      image.style.display = "";
    }
  };
  document.addEventListener(
    "error",
    (e) => {
      if (e.target instanceof HTMLImageElement) fallbackImage(e.target);
    },
    true,
  );
  const enhance = () => {
    document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      if (image.complete && !image.naturalWidth) fallbackImage(image);
    });
    const button =
        document.querySelector<HTMLButtonElement>("#mobile-menu-btn"),
      nav = document.querySelector<HTMLElement>(".header-nav");
    if (!button || !nav || button.dataset.enhanced) return;
    button.dataset.enhanced = "true";
    button.setAttribute("aria-controls", "header-nav");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () =>
      button.setAttribute(
        "aria-expanded",
        String(nav.classList.contains("open")),
      ),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
        button.focus();
      }
    });
    nav.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      }
    });
  };
  customElements.whenDefined("mightora-header").then(() => {
    measureHeader();
    enhance();
  });
}
async function init() {
  select("samplePicker").innerHTML = SAMPLE_OPTIONS.map(
    (s) => `<option value="${html(s.key)}">${html(s.name)}</option>`,
  ).join("");
  select("templatePicker").innerHTML = Object.entries(TEMPLATE_DEFINITIONS)
    .map(([id, d]) => option(id, d.name, "power"))
    .join("");
  if (location.hash.startsWith("#/")) {
    shared = true;
    try {
      const data = await readShare(location.hash);
      history = new History(data.project);
      readOnly = data.mode !== "edit";
      document.body.classList.add("shared-mode");
      if (data.mode === "embed") document.body.classList.add("embed-mode");
      $("sharedBanner").hidden = false;
      $("sharedBanner").textContent = readOnly
        ? "Shared read-only snapshot. Your saved local workspace is untouched."
        : "Shared editable copy. Changes stay in this temporary view until you explicitly save a new local assessment.";
      if (!readOnly) {
        document.body.classList.remove("shared-mode");
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = "Save as new local assessment";
        b.onclick = async () => {
          try {
            workspace = await loadWorkspace();
            const a = clone(assessment());
            a.id = uid();
            shared = false;
            location.hash = "";
            addProject(a);
            $("sharedBanner").hidden = true;
          } catch (e) {
            fail(e);
          }
        };
        $("sharedBanner").append(b);
      }
    } catch (e) {
      readOnly = true;
      document.body.classList.add("shared-mode");
      $("sharedBanner").hidden = false;
      $("sharedBanner").textContent =
        "The shared assessment could not be opened: " + errorText(e);
    }
  } else {
    try {
      workspace = await loadWorkspace();
      const active = workspace.projects.find(
        (p) => p.id === workspace.activeId,
      );
      if (active) history = new History(active);
      else {
        const legacy = localStorage.getItem("mightora:maturity:v1");
        if (legacy) {
          const migrated = parseProject(legacy);
          workspace.projects.push(migrated);
          workspace.activeId = migrated.id;
          history = new History(migrated);
        }
      }
    } catch (e) {
      $("saveState").textContent =
        "Local workspace could not be opened. Import a JSON backup.";
      fail(e);
    }
  }
  bind();
  render();
  previewReport();
  if (!shared) {
    $("saveState").textContent = workspace.projects.length
      ? "Local workspace opened"
      : "Choose a starting point";
    if (!workspace.projects.length) dialog("welcomeDialog").showModal();
  }
  setTimeout(networkInfo, 1500);
}
void init().catch((e) => {
  notify("Could not initialise the application. " + errorText(e));
});
