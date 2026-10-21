import {
  clone,
  LIMITS,
  html,
  type Assessment,
  type Capability,
} from "./model.ts";
import { parseProject, validate } from "./engine.ts";
export function csvEncode(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? "");
          if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
          return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
        })
        .join(","),
    )
    .join("\r\n");
}
export function csvDecode(text: string) {
  if (new TextEncoder().encode(text).length > LIMITS.bytes)
    throw new Error("CSV exceeds 10 MB.");
  text = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      if (closed)
        throw new Error("Unexpected content after a quoted CSV value.");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV value.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const fields = [
  "id",
  "domainId",
  "groupId",
  "name",
  "description",
  "current",
  "target",
  "priority",
  "weight",
  "evidence",
  "recommendations",
  "risks",
  "owner",
  "due",
  "notes",
  "criteria",
] as const;
export function exportCsv(a: Assessment) {
  return csvEncode([
    ["Domain", "Group", ...fields],
    ...a.capabilities.map((c) => [
      a.domains.find((d) => d.id === c.domainId)?.name ?? "",
      a.domains
        .find((d) => d.id === c.domainId)
        ?.groups.find((g) => g.id === c.groupId)?.name ?? "",
      ...fields.map((f) =>
        f === "criteria" ? JSON.stringify(c.criteria) : c[f],
      ),
    ]),
  ]);
}
export function importCsv(text: string, base: Assessment) {
  const [headers, ...rows] = csvDecode(text);
  if (headers?.includes("ID") && headers.includes("Capability")) {
    const aliases = new Map([
      ["ID", "id"],
      ["Capability", "name"],
      ["Current", "current"],
      ["Target", "target"],
      ["Priority", "priority"],
      ["Owner", "owner"],
      ["Evidence", "evidence"],
      ["Actions", "recommendations"],
    ]);
    headers.forEach((h, i) => (headers[i] = aliases.get(h) ?? h));
  }
  if (
    !headers ||
    ["Domain", "name", "id", "current", "target"].some(
      (h) => !headers.includes(h),
    )
  )
    throw new Error(
      "CSV needs Domain, name, id, current and target columns. Use the exported CSV as a template.",
    );
  if (rows.length > LIMITS.capabilities)
    throw new Error("Maximum 1,000 capabilities.");
  if (new Set(headers).size !== headers.length)
    throw new Error("Duplicate CSV column names.");
  const a = clone(base);
  a.capabilities = [];
  for (const row of rows) {
    if (row.length !== headers.length)
      throw new Error(
        "CSV row has a different number of columns to the header.",
      );
    const item = Object.fromEntries(
      headers.map((h, i) => [h, row[i].replace(/^'(?=[\s]*[=+@\-\t\r])/, "")]),
    );
    let domain =
      a.domains.find((d) => d.id === item.domainId) ||
      a.domains.find((d) => d.name === item.Domain);
    if (!domain) {
      domain = {
        id: item.domainId || crypto.randomUUID(),
        name: item.Domain,
        description: "",
        groups: [],
      };
      a.domains.push(domain);
    }
    let group =
      domain.groups.find((g) => g.id === item.groupId) ||
      domain.groups.find((g) => g.name === item.Group);
    if (item.Group && !group) {
      group = { id: item.groupId || crypto.randomUUID(), name: item.Group };
      domain.groups.push(group);
    }
    const score = (s: string) =>
      s === "" ? null : s === "NA" ? "NA" : Number(s);
    a.capabilities.push({
      id: item.id,
      domainId: domain.id,
      groupId: group?.id ?? "",
      name: item.name,
      description: item.description || "",
      current: score(item.current),
      target: score(item.target),
      priority: item.priority || "Medium",
      weight: item.weight ? Number(item.weight) : 1,
      evidence: item.evidence || "",
      recommendations: item.recommendations || "",
      risks: item.risks || "",
      owner: item.owner || "",
      due: item.due || "",
      notes: item.notes || "",
      criteria: item.criteria ? JSON.parse(item.criteria) : [],
    } as Capability);
  }
  return validate(a);
}
function base64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export async function shareLink(
  a: Assessment,
  mode: "view" | "edit" | "embed" | "summary",
  base: string,
) {
  if (base.startsWith("file:"))
    throw new Error(
      "Open the online edition to generate a usable share link, or send the JSON project file.",
    );
  let shared = clone(a);
  if (mode === "summary") {
    shared.owner = "";
    shared.description = "";
    shared.organisation = "";
    shared.snapshots = [];
    shared.capabilities.forEach((c) => {
      c.evidence = "";
      c.risks = "";
      c.notes = "";
      c.owner = "";
      c.recommendations = "";
      c.criteria = [];
    });
  }
  const encoded = new TextEncoder().encode(JSON.stringify(shared));
  if (encoded.length > LIMITS.bytes)
    throw new Error(
      "Assessment is too large to share. Download a complete JSON project instead.",
    );
  const data = await new Response(
    new Blob([encoded]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  const payload = base64(new Uint8Array(data));
  if (payload.length > LIMITS.share)
    throw new Error(
      "This link would be too long for reliable sharing. Download a JSON project instead.",
    );
  return base.split("#")[0].split("?")[0] + `#/${mode}/${payload}`;
}
export async function readShare(hash: string) {
  const match = /^#\/(view|edit|embed|summary)\/([\w-]+)$/.exec(hash);
  if (!match || match[2].length > LIMITS.share)
    throw new Error("Invalid or oversized share link.");
  const raw = atob(match[2].replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > LIMITS.bytes) {
      await reader.cancel();
      throw new Error("Shared data exceeds the 10 MB limit.");
    }
    chunks.push(value);
  }
  const text = await new Blob(chunks as BlobPart[]).text();
  return { mode: match[1], project: parseProject(text) };
}
export const embedCode = (url: string, title: string) =>
  `<iframe src="${html(url)}" title="${html(title)}" width="100%" height="960" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`;
