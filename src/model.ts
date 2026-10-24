/** Versioned, serialisable assessment contract. Null is unassessed; NA is inapplicable. */
export type Score = number | null | "NA";
export type Priority = "High" | "Medium" | "Low";
export interface Level {
  value: number;
  name: string;
  description: string;
  color: string;
  guidance: string;
  evidence: string;
}
export interface Group {
  id: string;
  name: string;
}
export interface Domain {
  id: string;
  name: string;
  description: string;
  groups: Group[];
}
export interface Criterion {
  id: string;
  text: string;
  met: boolean;
  evidence: string;
}
export interface Capability {
  id: string;
  domainId: string;
  groupId: string;
  name: string;
  description: string;
  current: Score;
  target: Score;
  priority: Priority;
  weight: number;
  evidence: string;
  recommendations: string;
  risks: string;
  owner: string;
  due: string;
  notes: string;
  criteria: Criterion[];
}
export interface Theme {
  preset: string;
  current: string;
  target: string;
  previous: string;
  font: string;
  labelSize: number;
}
export interface AssessmentBody {
  title: string;
  organisation: string;
  description: string;
  date: string;
  owner: string;
  assessmentVersion: string;
  reviewDate: string;
  framework: string;
  weighted: boolean;
  levels: Level[];
  domains: Domain[];
  capabilities: Capability[];
  theme: Theme;
}
export interface Snapshot {
  id: string;
  label: string;
  date: string;
  assessment: AssessmentBody;
}
export interface Assessment extends AssessmentBody {
  schemaVersion: 2;
  id: string;
  snapshots: Snapshot[];
}
export interface Workspace {
  updatedAt?: number;
  version: 2;
  activeId: string;
  projects: Assessment[];
}
export const LIMITS = {
  capabilities: 1000,
  domains: 100,
  groups: 100,
  snapshots: 30,
  projects: 40,
  bytes: 10_000_000,
  share: 16000,
};
/** randomUUID requires a secure context; getRandomValues also works on HTTP. */
export const uid = (): string => {
  const crypto = globalThis.crypto;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const today = () => new Date().toISOString().slice(0, 10);
export const LEVELS: Level[] = [
  ["Initial", "Activities are informal, inconsistent or reactive.", "#D9705B"],
  [
    "Developing",
    "Some repeatable practices exist but are not consistently applied.",
    "#E9B36D",
  ],
  [
    "Defined",
    "Standardised processes, policies and responsibilities are established.",
    "#E9C46A",
  ],
  [
    "Managed",
    "Practices are measured, governed and continuously monitored.",
    "#8AB8A2",
  ],
  [
    "Optimised",
    "Practices are continuously improved using evidence, automation and feedback.",
    "#2A9D8F",
  ],
].map(([name, description, color], i) => ({
  value: i + 1,
  name,
  description,
  color,
  guidance: `Demonstrate the practices described at level ${i + 1} consistently across the assessed scope.`,
  evidence:
    "Record dated examples, artefact references and the extent of adoption.",
}));
export const DEFAULT_THEME: Theme = {
  preset: "mightora",
  current: "#1769AA",
  target: "#B44D2E",
  previous: "#7654A3",
  font: "Arial",
  labelSize: 13,
};
export function blank(): Assessment {
  return {
    schemaVersion: 2,
    id: uid(),
    title: "Untitled assessment",
    organisation: "",
    description: "",
    date: today(),
    owner: "",
    assessmentVersion: "1.0",
    reviewDate: "",
    framework: "Custom framework",
    weighted: false,
    levels: clone(LEVELS),
    domains: [],
    capabilities: [],
    snapshots: [],
    theme: clone(DEFAULT_THEME),
  };
}
export function capability(domainId: string, groupId = ""): Capability {
  return {
    id: uid(),
    domainId,
    groupId,
    name: "New capability",
    description: "",
    current: null,
    target: null,
    priority: "Medium",
    weight: 1,
    evidence: "",
    recommendations: "",
    risks: "",
    owner: "",
    due: "",
    notes: "",
    criteria: [],
  };
}
export const domainName = (a: AssessmentBody, c: Capability) =>
  a.domains.find((d) => d.id === c.domainId)?.name ?? "Unknown domain";
export const groupName = (a: AssessmentBody, c: Capability) =>
  a.domains
    .find((d) => d.id === c.domainId)
    ?.groups.find((g) => g.id === c.groupId)?.name ?? "";
export const numeric = (s: Score): s is number =>
  typeof s === "number" && Number.isFinite(s);
export const gap = (c: Capability) =>
  numeric(c.current) && numeric(c.target) ? c.target - c.current : null;
export const scoreText = (s: Score, a?: AssessmentBody) =>
  s === "NA"
    ? "Not applicable"
    : s == null
      ? "Not assessed"
      : `${s}${a ? ` · ${a.levels[s - 1]?.name ?? ""}` : ""}`;
export const html = (s: unknown) =>
  String(s ?? "").replace(
    /[<>&"']/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const xml = (s: unknown) =>
  html(s)
    .replaceAll("&#39;", "&apos;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
export const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(2));
export function filename(a: AssessmentBody, ext: string) {
  return `${
    a.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 70) || "assessment"
  }-${a.date}.${ext}`;
}
