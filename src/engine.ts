import {
  blank,
  capability,
  clone,
  LEVELS,
  DEFAULT_THEME,
  LIMITS,
  uid,
  numeric,
  gap,
  today,
  type Assessment,
  type AssessmentBody,
  type Capability,
  type Score,
  type Snapshot,
} from "./model.ts";
export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(errors.slice(0, 8).join("\n"));
    this.name = "ValidationError";
  }
}
const record = (x: unknown): Record<string, any> =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, any>)
    : {};
export function parseProject(text: string): Assessment {
  if (new TextEncoder().encode(text).length > LIMITS.bytes)
    throw new ValidationError(["Project exceeds the 10 MB import limit."]);
  return validate(
    JSON.parse(text, (k, v) => {
      if (["__proto__", "prototype", "constructor"].includes(k))
        throw new Error("Unsafe object key in project.");
      return v;
    }),
  );
}
export function validate(raw: unknown): Assessment {
  let x = record(raw);
  if (x.version === 1) x = migrate(x);
  const errors: string[] = [];
  const ids = new Set<string>();
  const str = (v: any, path: string, max = 4000, required = false) => {
    if (typeof v !== "string") {
      if (v !== undefined && v !== null) errors.push(`${path}: expected text.`);
      v = "";
    }
    if (v.length > max) errors.push(`${path}: maximum ${max} characters.`);
    if (required && !v.trim()) errors.push(`${path}: required.`);
    return v.trim();
  };
  const id = (v: any, path: string) => {
    const s = str(v, path, 80, true);
    if (!/^[\w-]+$/.test(s))
      errors.push(`${path}: use letters, numbers, underscores or hyphens.`);
    if (ids.has(s)) errors.push(`${path}: duplicate ID ${s}.`);
    ids.add(s);
    return s;
  };
  const date = (v: any, path: string, required = false) => {
    const s = str(v, path, 10, required);
    if (
      s &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(s) ||
        !Number.isFinite(new Date(`${s}T00:00:00Z`).getTime()) ||
        new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s)
    )
      errors.push(`${path}: use a valid YYYY-MM-DD date.`);
    return s;
  };
  const array = (v: any, path: string, max: number) => {
    if (!Array.isArray(v)) {
      errors.push(`${path}: expected a list.`);
      return [];
    }
    if (v.length > max) {
      errors.push(`${path}: maximum ${max} items.`);
      return [];
    }
    return v;
  };
  const color = (v: any, path: string, fallback: string) => {
    if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
      errors.push(`${path}: use a six-digit hex colour.`);
      return fallback;
    }
    return v;
  };
  const body = (v: any, p = "assessment"): AssessmentBody => {
    v = record(v);
    const levels = array(v.levels, `${p}.levels`, 10).map(
      (l: any, i: number) => {
        l = record(l);
        if (l.value !== i + 1)
          errors.push(`${p}.levels: values must be consecutive from 1.`);
        return {
          value: i + 1,
          name: str(l.name, `${p}.level name`, 60, true),
          description: str(l.description, `${p}.level description`),
          guidance: str(l.guidance, `${p}.scoring guidance`),
          evidence: str(l.evidence, `${p}.evidence requirements`),
          color: color(l.color, `${p}.level colour`, "#888888"),
        };
      },
    );
    if (levels.length < 2)
      errors.push(`${p}.levels: define between 2 and 10 maturity levels.`);
    const domains = array(v.domains, `${p}.domains`, LIMITS.domains).map(
      (d: any, i: number) => {
        d = record(d);
        return {
          id: id(d.id, `${p}.domain ${i + 1}`),
          name: str(d.name, `${p}.domain name`, 160, true),
          description: str(d.description, `${p}.domain description`),
          groups: array(d.groups, `${p}.groups`, LIMITS.groups).map(
            (g: any) => ({
              id: id(g.id, `${p}.group ID`),
              name: str(g.name, `${p}.group name`, 160, true),
            }),
          ),
        };
      },
    );
    const score = (s: any, path: string): Score => {
      if (s === null || s === "NA") return s;
      if (Number.isInteger(s) && s >= 1 && s <= levels.length) return s;
      errors.push(
        `${path}: expected null, NA or an integer from 1 to ${levels.length}.`,
      );
      return null;
    };
    const capabilities = array(
      v.capabilities,
      `${p}.capabilities`,
      LIMITS.capabilities,
    ).map((c: any, i: number) => {
      c = record(c);
      const path = `${p}.capability ${i + 1}`;
      const d = domains.find((d) => d.id === c.domainId);
      if (!d) errors.push(`${path}: unknown domain.`);
      const groupId = str(c.groupId, `${path}.group`, 80);
      if (groupId && !d?.groups.some((g) => g.id === groupId))
        errors.push(`${path}: group does not belong to its domain.`);
      if (!["High", "Medium", "Low"].includes(c.priority))
        errors.push(`${path}: priority must be High, Medium or Low.`);
      if (
        typeof c.weight !== "number" ||
        !Number.isFinite(c.weight) ||
        c.weight <= 0 ||
        c.weight > 1000
      )
        errors.push(`${path}: weight must be greater than 0 and at most 1000.`);
      return {
        id: id(c.id, `${path}.id`),
        domainId: str(c.domainId, `${path}.domain`, 80, true),
        groupId,
        name: str(c.name, `${path}.name`, 240, true),
        description: str(c.description, `${path}.description`),
        current: score(c.current, `${path}.current`),
        target: score(c.target, `${path}.target`),
        priority: c.priority,
        weight: c.weight,
        evidence: str(c.evidence, `${path}.evidence`, 10000),
        recommendations: str(
          c.recommendations,
          `${path}.recommendations`,
          10000,
        ),
        risks: str(c.risks, `${path}.risks`, 10000),
        owner: str(c.owner, `${path}.owner`, 160),
        due: date(c.due, `${path}.due`),
        notes: str(c.notes, `${path}.notes`, 10000),
        criteria: array(c.criteria, `${path}.criteria`, 100).map((r: any) => ({
          id: id(r.id, `${path}.criterion ID`),
          text: str(r.text, `${path}.criterion`, 1000, true),
          met: r.met === true,
          evidence: str(r.evidence, `${path}.criterion evidence`, 4000),
        })),
      } as Capability;
    });
    const t = record(v.theme);
    return {
      title: str(v.title, `${p}.title`, 200, true),
      organisation: str(v.organisation, `${p}.organisation`, 200),
      description: str(v.description, `${p}.description`, 10000),
      date: date(v.date, `${p}.date`, true),
      owner: str(v.owner, `${p}.owner`, 160),
      assessmentVersion: str(v.assessmentVersion, `${p}.version`, 60, true),
      reviewDate: date(v.reviewDate, `${p}.review date`),
      framework: str(v.framework, `${p}.framework`, 200),
      weighted: v.weighted === true,
      levels,
      domains,
      capabilities,
      theme: {
        preset: str(t.preset, `${p}.theme`, 30) || "mightora",
        current: color(t.current, `${p}.current colour`, DEFAULT_THEME.current),
        target: color(t.target, `${p}.target colour`, DEFAULT_THEME.target),
        previous: color(
          t.previous,
          `${p}.previous colour`,
          DEFAULT_THEME.previous,
        ),
        font: str(t.font, `${p}.font`, 72) || "Arial",
        labelSize:
          typeof t.labelSize === "number" &&
          t.labelSize >= 9 &&
          t.labelSize <= 24
            ? t.labelSize
            : 13,
      },
    };
  };
  if (x.schemaVersion !== 2)
    errors.push(
      "Unsupported schema version. Expected schemaVersion 2 or legacy version 1.",
    );
  const projectId = id(x.id, "assessment ID");
  const main = body(x);
  const snapshots = array(x.snapshots, "snapshots", LIMITS.snapshots).map(
    (s: any, i: number) => {
      s = record(s);
      const snapshotId = id(s.id, "snapshot ID");
      const savedIds = new Set(ids);
      ids.clear();
      const assessment = body(s.assessment, `snapshot ${i + 1}`);
      ids.clear();
      savedIds.forEach((v) => ids.add(v));
      return {
        id: snapshotId,
        label: str(s.label, "snapshot label", 200, true),
        date: date(s.date, "snapshot date", true),
        assessment,
      };
    },
  );
  if (errors.length) throw new ValidationError(errors);
  return { ...main, schemaVersion: 2, id: projectId, snapshots };
}
export function migrate(x: Record<string, any>): Assessment {
  const a = blank();
  a.title = typeof x.title === "string" ? x.title : a.title;
  a.description = typeof x.description === "string" ? x.description : "";
  if (Array.isArray(x.levels) && x.levels.length === 5)
    a.levels = LEVELS.map((l, i) => ({ ...l, name: String(x.levels[i]) }));
  const caps = Array.isArray(x.capabilities) ? x.capabilities : [];
  const ds = [...new Set(caps.map((c: any) => String(c.domain ?? "")))];
  a.domains = ds.map((name, i) => ({
    id: `legacy-domain-${i}`,
    name,
    description: "",
    groups: [],
  }));
  a.capabilities = caps.map((c: any) => ({
    ...capability(a.domains[ds.indexOf(String(c.domain ?? ""))].id),
    id: c.id || uid(),
    name: c.name,
    current: c.current === undefined ? null : c.current,
    target: c.target === undefined ? null : c.target,
    priority: c.priority || "Medium",
    owner: c.owner || "",
    evidence: c.evidence || "",
    recommendations: c.actions || "",
  }));
  return a;
}
export function stats(a: AssessmentBody, items = a.capabilities) {
  const average = (key: "current" | "target") => {
    const selected = items.filter((c) => numeric(c[key]));
    const denominator = selected.reduce(
      (n, c) => n + (a.weighted ? c.weight : 1),
      0,
    );
    return denominator
      ? selected.reduce(
          (n, c) => n + (c[key] as number) * (a.weighted ? c.weight : 1),
          0,
        ) / denominator
      : null;
  };
  const paired = items.filter((c) => gap(c) !== null);
  const denominator = paired.reduce(
    (n, c) => n + (a.weighted ? c.weight : 1),
    0,
  );
  return {
    total: items.length,
    assessed: items.filter((c) => numeric(c.current)).length,
    notApplicable: items.filter((c) => c.current === "NA").length,
    unassessed: items.filter((c) => c.current === null).length,
    current: average("current"),
    target: average("target"),
    gap: denominator
      ? paired.reduce((n, c) => n + gap(c)! * (a.weighted ? c.weight : 1), 0) /
        denominator
      : null,
    attention: items.filter(
      (c) =>
        c.risks ||
        ((gap(c) ?? 0) > 0 && (c.priority === "High" || (gap(c) ?? 0) >= 2)),
    ).length,
  };
}
export const priorityRank = (p: string) =>
  ({ High: 3, Medium: 2, Low: 1 })[p] ?? 0;
export function improvements(items: Capability[], sort = "priority") {
  return [...items].sort((a, b) =>
    sort === "gap"
      ? (gap(b) ?? -Infinity) - (gap(a) ?? -Infinity)
      : sort === "weight"
        ? b.weight - a.weight
        : sort === "due"
          ? (a.due || "9999").localeCompare(b.due || "9999")
          : priorityRank(b.priority) - priorityRank(a.priority) ||
            (gap(b) ?? -Infinity) - (gap(a) ?? -Infinity) ||
            b.weight - a.weight,
  );
}
export function snapshot(
  a: Assessment,
  label: string,
  date = today(),
): Snapshot {
  const { schemaVersion, id, snapshots, ...assessment } = clone(a);
  return { id: uid(), label, date, assessment };
}
export class History<T> {
  past: T[] = [];
  future: T[] = [];
  constructor(public value: T) {}
  commit(next: T) {
    this.past.push(clone(this.value));
    if (this.past.length > 50) this.past.shift();
    this.future = [];
    this.value = clone(next);
  }
  undo() {
    if (this.past.length) {
      this.future.push(clone(this.value));
      this.value = this.past.pop()!;
    }
    return this.value;
  }
  redo() {
    if (this.future.length) {
      this.past.push(clone(this.value));
      this.value = this.future.pop()!;
    }
    return this.value;
  }
}
export const methodology = (a: AssessmentBody) =>
  `${a.weighted ? "Weighted mean: sum(score × capability weight) / sum(weights of scored capabilities)." : "Arithmetic mean: sum(scored capability values) / number of scored capabilities."} Current and target use their own scored populations. Not assessed and Not applicable are excluded, never zero. Gap = target − current for paired numeric scores only, and may be negative. Maturity levels are ordinal; averages are descriptive, not certification. Business priority, risk and context determine action order. Historical scores retain their original scales; compare changed scales with care.`;
