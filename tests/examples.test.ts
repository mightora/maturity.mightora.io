import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { SAMPLE_OPTIONS, sampleAssessment } from "../src/examples.ts";
import { validate } from "../src/engine.ts";
import { exportCsv, importCsv } from "../src/transfer.ts";

test("eight complete scenarios validate with capability-specific evidence and independent history", () => {
  assert.equal(SAMPLE_OPTIONS.length, 8);
  for (const option of SAMPLE_OPTIONS) {
    const a = validate(sampleAssessment(option.key));
    assert(a.organisation && a.description && a.owner && a.reviewDate);
    assert(a.capabilities.length >= 8);
    assert.equal(a.snapshots.length, 2);
    assert(
      a.capabilities.every(
        (c) =>
          c.evidence &&
          c.recommendations &&
          c.owner &&
          c.due &&
          c.criteria.length >= 2,
      ),
    );
    assert(new Set(a.capabilities.map((c) => c.evidence)).size >= 8);
    const original = a.snapshots[0].assessment.capabilities[0].current;
    a.capabilities[0].current = 5;
    assert.equal(a.snapshots[0].assessment.capabilities[0].current, original);
    const copy = sampleAssessment(option.key);
    assert.notEqual(a.id, copy.id);
    assert.notEqual(a.capabilities[0].id, copy.capabilities[0].id);
    assert.equal(
      importCsv(exportCsv(copy), copy).capabilities.length,
      copy.capabilities.length,
    );
  }
  assert.throws(() => sampleAssessment("missing"), /Unknown sample/);
});
test("samples demonstrate weighting, missing scores and business priorities separately from gaps", () => {
  assert.equal(sampleAssessment("cloud").weighted, true);
  assert.equal(sampleAssessment("general").weighted, false);
  assert(
    sampleAssessment("security").capabilities.some(
      (c) => c.current === null && c.priority === "High",
    ),
  );
  assert(
    sampleAssessment("devops").capabilities.some(
      (c) => c.current === c.target && c.priority === "Low",
    ),
  );
  const general = sampleAssessment("general");
  assert.equal(
    general.capabilities.find((c) => c.name === "Continuous improvement")
      ?.priority,
    "Medium",
  );
  assert.equal(
    general.capabilities.find((c) => c.name === "Service resilience")?.priority,
    "High",
  );
});
test("downloadable sample pack contains eight complete JSON projects, CSV and usage instructions", async () => {
  const zip = await JSZip.loadAsync(
    await readFile("dist/maturity-samples.zip"),
  );
  const projects = Object.keys(zip.files).filter((n) =>
    n.endsWith(".maturity.json"),
  );
  assert.equal(projects.length, 8);
  assert.equal(
    Object.keys(zip.files).filter((n) => n.endsWith(".csv")).length,
    8,
  );
  for (const path of projects) {
    const a = validate(JSON.parse(await zip.file(path)!.async("string")));
    assert.equal(a.snapshots.length, 2);
    assert(a.capabilities.every((c) => c.evidence && c.recommendations));
  }
  assert.match(await zip.file("README.md")!.async("string"), /fictional/);
  assert(zip.file("LICENSE"));
});

test("Power Platform security covers seven domains, weighted controls, evidence and independent security history", () => {
  const a = validate(sampleAssessment("power-security"));
  assert.equal(a.domains.length, 7);
  assert.equal(a.capabilities.length, 21);
  assert.equal(a.weighted, true);
  assert.equal(a.capabilities.filter((c) => c.current === null).length, 1);
  assert(
    a.capabilities.every(
      (c) => c.risks && c.owner && c.recommendations && c.criteria.length === 2,
    ),
  );
  assert(a.capabilities.some((c) => c.name.includes("Power Pages")));
  assert(a.capabilities.some((c) => c.name.includes("Data policies")));
  assert(a.capabilities.some((c) => c.name.includes("Flow connections")));
  assert(a.capabilities.some((c) => c.name.includes("Agent knowledge")));
  assert(a.capabilities.some((c) => c.name.includes("Column security")));
  assert(a.description.includes("not a security audit"));
  assert(
    a.snapshots.every((s) =>
      s.assessment.capabilities.every(
        (c) => !c.evidence.includes("Fictional October"),
      ),
    ),
  );
});

test("delivery sample covers end-to-end delivery with weighted priorities, evidence and preserved history", () => {
  const a = validate(sampleAssessment("delivery"));
  assert.equal(a.domains.length, 6);
  assert.equal(a.capabilities.length, 18);
  assert.equal(a.weighted, true);
  assert.equal(a.snapshots.length, 2);
  assert(
    a.capabilities.every(
      (c) => c.evidence && c.risks && c.recommendations && c.owner && c.due,
    ),
  );
  const benefits = a.capabilities.find(
    (c) => c.name === "Benefits ownership and measurement",
  )!;
  assert.equal(benefits.current, null);
  const reporting = a.capabilities.find(
    (c) => c.name === "Delivery transparency and reporting",
  )!;
  const release = a.capabilities.find(
    (c) => c.name === "Release readiness and contingency",
  )!;
  assert(
    Number(reporting.target) - Number(reporting.current) >
      Number(release.target) - Number(release.current),
  );
  assert.equal(reporting.priority, "Medium");
  assert.equal(release.priority, "High");
  assert(a.capabilities.some((c) => c.name.includes("supplier")));
  assert(a.levels[3].guidance.includes("forecasts"));
  assert(
    a.snapshots.every((s) =>
      s.assessment.capabilities.every(
        (c) => !c.evidence.startsWith("Fictional October"),
      ),
    ),
  );
});
