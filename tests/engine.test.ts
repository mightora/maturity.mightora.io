import { test } from "node:test";
import assert from "node:assert/strict";
import { blank, capability, clone, gap, uid, LEVELS } from "../src/model.ts";
import {
  validate,
  stats,
  snapshot,
  History,
  parseProject,
  improvements,
} from "../src/engine.ts";
import { template, TEMPLATE_DEFINITIONS } from "../src/templates.ts";
import {
  exportCsv,
  importCsv,
  csvDecode,
  shareLink,
  readShare,
} from "../src/transfer.ts";
import { renderChart, type View, type ViewOptions } from "../src/visuals.ts";
const example = () => template("power", true);
test("blank and all six illustrative frameworks validate", () => {
  assert.equal(validate(blank()).capabilities.length, 0);
  assert.equal(Object.keys(TEMPLATE_DEFINITIONS).length, 6);
  for (const key of Object.keys(TEMPLATE_DEFINITIONS)) {
    const a = validate(template(key));
    assert(a.capabilities.length >= 8);
    assert(
      a.capabilities.every((c) => c.current === null && c.criteria.length >= 2),
    );
  }
});
test("complete Power Platform example includes evidence risks ownership and history", () => {
  const a = validate(example());
  assert.equal(a.capabilities.length, 12);
  assert.equal(a.snapshots.length, 2);
  assert(
    a.capabilities.every((c) => c.evidence && c.owner && c.recommendations),
  );
  assert(a.capabilities.some((c) => c.risks));
});
test("weighted mean excludes missing and N/A states instead of using zero", () => {
  const a = example();
  a.capabilities = a.capabilities.slice(0, 4);
  [
    a.capabilities[0].current,
    a.capabilities[1].current,
    a.capabilities[2].current,
    a.capabilities[3].current,
  ] = [1, 5, null, "NA"];
  a.capabilities[0].weight = 1;
  a.capabilities[1].weight = 3;
  a.weighted = true;
  const s = stats(a);
  assert.equal(s.current, 4);
  assert.equal(s.assessed, 2);
  assert.equal(s.unassessed, 1);
  assert.equal(s.notApplicable, 1);
  a.weighted = false;
  assert.equal(stats(a).current, 3);
});
test("target and current populations are independent; paired gaps remain signed", () => {
  const a = example();
  a.capabilities = a.capabilities.slice(0, 2);
  a.capabilities[0].current = 4;
  a.capabilities[0].target = 2;
  a.capabilities[1].current = null;
  a.capabilities[1].target = 5;
  assert.equal(gap(a.capabilities[0]), -2);
  assert.equal(gap(a.capabilities[1]), null);
  assert.equal(stats(a).gap, -2);
  assert.equal(stats(a).target, 3.5);
});
test("custom maturity scales support 2 through 10 levels and reject out-of-range scores", () => {
  const a = example();
  a.levels.push({ ...LEVELS[4], value: 6, name: "Adaptive" });
  a.capabilities[0].current = 6;
  assert.equal(validate(a).capabilities[0].current, 6);
  a.capabilities[0].current = 7;
  assert.throws(() => validate(a), /integer from 1 to 6/);
  a.capabilities[0].current = 0;
  assert.throws(() => validate(a), /integer/);
});
test("snapshots retain full historical scores scales criteria and metadata independently", () => {
  const a = example(),
    s = snapshot(a, "Baseline");
  a.capabilities[0].current = 5;
  a.levels[0].name = "Renamed";
  a.capabilities[0].criteria[0].text = "Changed";
  a.organisation = "Changed organisation";
  assert.equal(s.assessment.capabilities[0].current, 2);
  assert.equal(s.assessment.levels[0].name, "Initial");
  assert.notEqual(s.assessment.capabilities[0].criteria[0].text, "Changed");
  assert.notEqual(s.assessment.organisation, "Changed organisation");
});
test("undo and redo preserve independent objects and clear the future after a new edit", () => {
  const h = new History(example());
  const next = clone(h.value);
  next.title = "Changed";
  h.commit(next);
  assert.equal(
    h.undo().title,
    "Power Platform governance and engineering example",
  );
  assert.equal(h.redo().title, "Changed");
  h.undo();
  h.commit({ ...h.value, title: "New branch" });
  assert.equal(h.future.length, 0);
});
test("business priority outranks the largest numeric gap", () => {
  const a = example();
  a.capabilities[0].priority = "High";
  a.capabilities[0].current = 4;
  a.capabilities[0].target = 5;
  a.capabilities[1].priority = "Low";
  a.capabilities[1].current = 1;
  a.capabilities[1].target = 5;
  assert.equal(
    improvements(a.capabilities.slice(0, 2))[0].id,
    a.capabilities[0].id,
  );
  assert.equal(
    improvements(a.capabilities.slice(0, 2), "gap")[0].id,
    a.capabilities[1].id,
  );
});
test("duplicate IDs unknown hierarchy invalid weights and invalid dates are rejected", () => {
  const a = example();
  a.capabilities[1].id = a.capabilities[0].id;
  assert.throws(() => validate(a), /duplicate ID/);
  const b = example();
  b.capabilities[0].domainId = "missing";
  assert.throws(() => validate(b), /unknown domain/);
  const c = example();
  c.capabilities[0].weight = 0;
  assert.throws(() => validate(c), /weight/);
  const d = example();
  d.date = "2026-02-30";
  assert.throws(() => validate(d), /valid YYYY/);
});
test("legacy source projects migrate while retaining names evidence actions and capability IDs", () => {
  const a = parseProject(
    JSON.stringify({
      version: 1,
      title: "Legacy",
      description: "Old project",
      levels: LEVELS.map((l) => l.name),
      capabilities: [
        {
          id: "old-id",
          domain: "Governance",
          name: "ALM",
          current: 2,
          target: 4,
          priority: "High",
          owner: "Owner",
          evidence: "Existing evidence",
          actions: "Existing action",
        },
      ],
    }),
  );
  assert.equal(a.schemaVersion, 2);
  assert.equal(a.capabilities[0].id, "old-id");
  assert.equal(a.capabilities[0].recommendations, "Existing action");
});
test("complete JSON roundtrip retains snapshots metadata custom theme and criteria", () => {
  const a = validate(example());
  assert.deepEqual(parseProject(JSON.stringify(a)), a);
});
test("CSV roundtrip retains multiline Unicode and formula-like text", () => {
  const a = example();
  a.capabilities[0].name = "Énergie, sécurité & <platform> 🧭";
  a.capabilities[0].evidence = 'A "quoted" line\nSecond line';
  a.capabilities[1].recommendations = '=HYPERLINK("https://invalid.example")';
  const text = exportCsv(a);
  assert(text.includes("'=HYPERLINK"));
  const result = importCsv(text, a);
  assert.deepEqual(result.capabilities, a.capabilities);
  assert.deepEqual(result.snapshots, a.snapshots);
});
test("malformed CSV invalid JSON and prototype keys never produce a valid project", () => {
  assert.throws(() => csvDecode('"unclosed'));
  assert.throws(() => csvDecode('"closed"oops'));
  assert.throws(() => parseProject("{"));
  assert.throws(() => parseProject('{"__proto__":{}}'), /Unsafe/);
  assert.throws(() =>
    importCsv("Domain,name,id,current,target\nA,A,x,99,2", example()),
  );
});
test("read-only sharing preserves a full validated snapshot and no query parameters", async () => {
  const a = example();
  const link = await shareLink(
    a,
    "view",
    "https://maturity.mightora.io/?old=query#before",
  );
  assert(link.startsWith("https://maturity.mightora.io/#/view/"));
  assert(!link.includes("?"));
  const value = await readShare(new URL(link).hash);
  assert.equal(value.mode, "view");
  assert.deepEqual(value.project, a);
});
test("summary sharing removes evidence notes risks recommendations owners and snapshots", async () => {
  const a = example();
  const link = await shareLink(a, "summary", "https://maturity.mightora.io/");
  const { project } = await readShare(new URL(link).hash);
  assert.equal(project.snapshots.length, 0);
  assert(
    project.capabilities.every(
      (c) =>
        !c.evidence &&
        !c.notes &&
        !c.risks &&
        !c.recommendations &&
        !c.owner &&
        !c.criteria.length,
    ),
  );
});
test("invalid share payloads oversized fragments and offline links fail helpfully", async () => {
  await assert.rejects(() => readShare("#/view/invalid"));
  await assert.rejects(
    () => readShare("#/edit/" + "A".repeat(16001)),
    /oversized/,
  );
  await assert.rejects(
    () => shareLink(example(), "view", "file:///index.html"),
    /online edition/,
  );
});
test("all six SVG views render from shared data and escape labels", () => {
  const a = example();
  a.capabilities[0].name = "<script>alert(1)</script> & long Unicode 名";
  for (const view of [
    "executive",
    "radar",
    "heatmap",
    "comparison",
    "gap",
    "history",
  ] as View[]) {
    const result = renderChart(a, {
      view,
      items: a.capabilities,
      measure: "current",
      current: true,
      target: true,
      previous: true,
      previousSnapshot: a.snapshots[0],
      page: 0,
      labelSize: 13,
      historyScope: "",
      sort: "priority",
    });
    assert(result.svg.includes("<svg"));
    assert(!result.svg.includes("<script>"));
    assert(!result.svg.includes("NaN"));
    assert(result.note);
  }
});
test("large assessments and long labels paginate explicitly instead of dropping capabilities", () => {
  const a = example(),
    base = clone(a.capabilities[0]);
  a.capabilities = Array.from({ length: 1000 }, (_, i) => ({
    ...clone(base),
    id: uid(),
    name: `Capability ${i} with an exceptionally long descriptive label`,
    criteria: [],
  }));
  const result = renderChart(a, {
    view: "radar",
    items: a.capabilities,
    measure: "current",
    current: true,
    target: true,
    previous: false,
    page: 49,
    labelSize: 13,
    historyScope: "",
    sort: "priority",
  });
  assert.equal(result.pages, 50);
  assert(result.note.includes("Page 50 of 50"));
  assert(result.svg.includes("Capability 980"));
  assert.equal(validate(a).capabilities.length, 1000);
});
test("earlier CSV column names migrate without losing stable IDs or evidence", () => {
  const a = importCsv(
    "ID,Domain,Capability,Current,Target,Priority,Owner,Evidence,Actions\r\nlegacy-123,Governance,ALM,2,4,High,Platform lead,Existing evidence,Keep existing actions",
    blank(),
  );
  assert.equal(a.capabilities[0].id, "legacy-123");
  assert.equal(a.capabilities[0].evidence, "Existing evidence");
  assert.equal(a.capabilities[0].recommendations, "Keep existing actions");
  assert.equal(a.capabilities[0].current, 2);
});
