import {
  xml,
  numeric,
  gap,
  fmt,
  scoreText,
  domainName,
  type Assessment,
  type Capability,
  type Snapshot,
} from "./model.ts";
import { stats, improvements } from "./engine.ts";
export type View =
  "executive" | "radar" | "heatmap" | "comparison" | "gap" | "history";
export interface ViewOptions {
  view: View;
  items: Capability[];
  measure: "current" | "target" | "gap";
  current: boolean;
  target: boolean;
  previous: boolean;
  previousSnapshot?: Snapshot;
  page: number;
  labelSize: number;
  historyScope: string;
  sort: string;
}
const colors = { ink: "#102A43", muted: "#486581", line: "#D9E2EC" };
const text = (s: unknown, x: number, y: number, size = 13, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${colors.ink}" ${extra}>${xml(s)}</text>`;
function lines(
  s: string,
  x: number,
  y: number,
  size = 12,
  anchor = "start",
  chars = 27,
  max = 3,
) {
  const parts = s.match(
    new RegExp(`.{1,${chars}}(?:\\s|$)|.{1,${chars}}`, "g"),
  ) ?? [""];
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" fill="${colors.ink}"><title>${xml(s)}</title>${parts
    .slice(0, max)
    .map(
      (p, i) =>
        `<tspan x="${x}" dy="${i ? size * 1.2 : 0}">${xml(p.trim())}${i === max - 1 && parts.length > max ? "…" : ""}</tspan>`,
    )
    .join("")}</text>`;
}
const capGroup = (c: Capability, content: string) =>
  `<g tabindex="0" role="button" data-cap="${xml(c.id)}" aria-label="${xml(c.name)}. Current ${scoreText(c.current)}, target ${scoreText(c.target)}. Open details."><title>${xml(c.name)}: current ${scoreText(c.current)}, target ${scoreText(c.target)}</title>${content}</g>`;
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = colors.line,
  width = 1,
  dash = "",
) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
function wrapper(title: string, body: string, height = 640, width = 1000) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><desc>Interactive assessment visualisation. A complete accessible score table accompanies this chart. Not assessed and not applicable values are not zero.</desc><rect width="${width}" height="${height}" fill="#FFFFFF"/>${body}</svg>`;
}
const scaleMatch = (a: Assessment, s?: Snapshot) =>
  !!s &&
  JSON.stringify(a.levels.map((l) => l.name)) ===
    JSON.stringify(s.assessment.levels.map((l) => l.name));
export function renderChart(
  a: Assessment,
  o: ViewOptions,
): { svg: string; note: string; pages: number } {
  const size = o.view === "radar" ? 20 : o.view === "heatmap" ? 80 : 40;
  const pages = Math.max(1, Math.ceil(o.items.length / size));
  const page = Math.min(o.page, pages - 1);
  const all =
    o.view === "gap"
      ? improvements(o.items, o.sort)
      : o.view === "comparison" || o.view === "heatmap"
        ? [...o.items].sort(
            (left, right) =>
              a.domains.findIndex((d) => d.id === left.domainId) -
              a.domains.findIndex((d) => d.id === right.domainId),
          )
        : o.items;
  const caps = all.slice(page * size, (page + 1) * size);
  const max = a.levels.length;
  const caption = `Showing ${caps.length} of ${all.length} filtered capabilities. Page ${page + 1} of ${pages}.`;
  if (!o.items.length && o.view !== "history")
    return {
      svg: wrapper(
        "No assessment data",
        text(
          "Add capabilities or reset the filters to begin.",
          500,
          280,
          20,
          'text-anchor="middle"',
        ),
      ),
      note: "No capabilities match this view.",
      pages: 1,
    };
  if (o.view === "radar") {
    const n = caps.length,
      cx = 500,
      cy = 370,
      r = 235;
    const polar = (value: number, i: number, offset = 0) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * ((r * value) / max + offset),
        y: cy + Math.sin(angle) * ((r * value) / max + offset),
      };
    };
    const pts = (v: number) =>
      caps
        .map((_, i) => {
          const p = polar(v, i);
          return `${p.x},${p.y}`;
        })
        .join(" ");
    let body = "";
    if (n < 3) {
      body =
        text(
          "A radar needs at least three capabilities.",
          500,
          240,
          20,
          'text-anchor="middle"',
        ) +
        text(
          "Use comparison or heatmap for smaller assessments.",
          500,
          275,
          16,
          'text-anchor="middle"',
        );
      return {
        svg: wrapper("Maturity radar", body, 760),
        note: caption,
        pages,
      };
    }
    for (let k = 1; k <= max; k++) {
      body +=
        `<polygon points="${pts(k)}" fill="none" stroke="${colors.line}"/>` +
        text(k, cx + 8, cy - (r * k) / max - 4, 11);
    }
    caps.forEach((c, i) => {
      const end = polar(max, i),
        lp = polar(max, i, 52),
        anchor = lp.x > cx + 20 ? "start" : lp.x < cx - 20 ? "end" : "middle";
      body +=
        line(cx, cy, end.x, end.y) +
        capGroup(c, lines(c.name, lp.x, lp.y, o.labelSize, anchor, 23, 3));
    });
    const series: {
      name: string;
      color: string;
      dash: string;
      values: (number | null)[];
    }[] = [];
    if (o.target)
      series.push({
        name: "Target",
        color: a.theme.target,
        dash: "8 5",
        values: caps.map((c) => (numeric(c.target) ? c.target : null)),
      });
    if (o.previous && scaleMatch(a, o.previousSnapshot))
      series.push({
        name: "Previous",
        color: a.theme.previous,
        dash: "2 5",
        values: caps.map((c) => {
          const s = o.previousSnapshot?.assessment.capabilities.find(
            (v) => v.id === c.id,
          )?.current;
          return numeric(s ?? null) ? (s as number) : null;
        }),
      });
    if (o.current)
      series.push({
        name: "Current",
        color: a.theme.current,
        dash: "",
        values: caps.map((c) => (numeric(c.current) ? c.current : null)),
      });
    for (const s of series) {
      const values = s.values.map((v, i) => (v === null ? null : polar(v, i)));
      if (values.every((v) => v !== null))
        body += `<polygon points="${values.map((p) => `${p!.x},${p!.y}`).join(" ")}" fill="${s.color}" fill-opacity="0.06" stroke="none"/>`;
      values.forEach((p, i) => {
        const next = values[(i + 1) % n];
        if (p && next)
          body += line(p.x, p.y, next.x, next.y, s.color, 2.5, s.dash);
        if (p)
          body += capGroup(
            caps[i],
            `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${s.color}" stroke="white" stroke-width="2"/><title>${xml(s.name)}: ${s.values[i]}</title>`,
          );
      });
    }
    series.forEach(
      (s, i) =>
        (body +=
          line(250 + i * 170, 35, 285 + i * 170, 35, s.color, 3, s.dash) +
          text(s.name, 295 + i * 170, 40, 13)),
    );
    return {
      svg: wrapper("Capability maturity radar", body, 760),
      note: `${caption} Rings represent levels 1–${max}. Gaps in a line indicate missing scores.${o.previous && !scaleMatch(a, o.previousSnapshot) ? " Previous series hidden because its scale differs or no snapshot is selected." : ""}`,
      pages,
    };
  }
  if (o.view === "heatmap") {
    let y = 75,
      body = text(`Maturity heatmap · ${o.measure}`, 30, 35, 22);
    for (const d of a.domains) {
      const ds = caps.filter((c) => c.domainId === d.id);
      if (!ds.length) continue;
      body += text(d.name, 30, y, 17);
      y += 20;
      ds.forEach((c) => {
        const s = o.measure === "gap" ? gap(c) : c[o.measure];
        const color = numeric(s)
          ? o.measure === "gap"
            ? s > 0
              ? "#FBE7CF"
              : "#D8EEE8"
            : (a.levels[s - 1]?.color ?? "#EEF2F6")
          : "#EDF2F7";
        const state =
          o.measure === "gap"
            ? s == null
              ? "No paired scores"
              : `${typeof s === "number" && s > 0 ? "+" : ""}${s} levels`
            : scoreText(s, a);
        const rowHeight = c.name.length > 70 || state.length > 28 ? 72 : 44;
        body += capGroup(
          c,
          `<rect x="30" y="${y}" width="940" height="${rowHeight}" rx="4" fill="${color}" stroke="#BCCCDC"/>${lines(c.name, 43, y + 24, 13, "start", 70, 3)}${lines(state, 945, y + 24, 12, "end", 28, 3)}`,
        );
        y += rowHeight + 6;
      });
      y += 22;
    }
    return {
      svg: wrapper("Capability maturity heatmap", body, y + 20),
      note:
        caption +
        " Each row displays a numeric value or a named assessment state.",
      pages,
    };
  }
  if (o.view === "comparison") {
    let y = 85,
      body =
        text("Current and target maturity", 25, 30, 22) +
        line(650, 32, 680, 32, a.theme.current, 9) +
        text("Current", 690, 37) +
        line(800, 32, 830, 32, a.theme.target, 5, "6 4") +
        text("Target", 840, 37);
    let last = "";
    caps.forEach((c) => {
      const domain = domainName(a, c);
      if (domain !== last) {
        body += text(domain, 25, y, 16);
        y += 24;
        last = domain;
      }
      const row = lines(c.name, 25, y + 15, 12, "start", 40, 3);
      let bars = "";
      if (numeric(c.current))
        bars += `<rect x="390" y="${y}" width="${(c.current / max) * 490}" height="13" fill="${a.theme.current}"/>`;
      if (numeric(c.target))
        bars += `<rect x="390" y="${y + 20}" width="${(c.target / max) * 490}" height="10" fill="${a.theme.target}"/>`;
      body += capGroup(
        c,
        row +
          bars +
          text(
            `${scoreText(c.current)} / ${scoreText(c.target)}`,
            965,
            y + 19,
            11,
            'text-anchor="end"',
          ),
      );
      y += 65;
    });
    return {
      svg: wrapper("Current versus target comparison", body, y + 20),
      note:
        caption +
        ` Bars use a 1–${max} scale. Text gives current / target values. Missing scores have no bar.`,
      pages,
    };
  }
  if (o.view === "gap") {
    let y = 85,
      body = text("Capability gaps and business priorities", 25, 32, 22);
    ["Capability", "Gap", "Priority", "Weight", "Owner / due"].forEach(
      (v, i) => (body += text(v, [25, 420, 500, 610, 705][i], 65, 12)),
    );
    for (const c of caps) {
      body += capGroup(
        c,
        `<rect x="20" y="${y - 20}" width="960" height="68" fill="${Math.floor(y / 74) % 2 ? "#F0F4F8" : "#FFFFFF"}"/>` +
          lines(c.name, 30, y, 12, "start", 44, 3) +
          text(gap(c) == null ? "—" : gap(c), 425, y, 14) +
          text(c.priority, 500, y) +
          text(c.weight, 620, y) +
          lines(
            `${c.owner || "Unassigned"} · ${c.due || "No target date"}`,
            710,
            y,
            12,
            "start",
            30,
            2,
          ),
      );
      y += 74;
    }
    return {
      svg: wrapper("Gap analysis", body, y + 20),
      note:
        caption +
        " Business priority is independent of numeric gap. Negative gaps mean current exceeds target.",
      pages,
    };
  }
  if (o.view === "executive") {
    let y = 95,
      body = text("Domain maturity overview", 25, 35, 22);
    for (const d of a.domains) {
      const items = o.items.filter((c) => c.domainId === d.id),
        s = stats(a, items);
      if (!items.length) continue;
      body +=
        lines(d.name, 25, y, 13, "start", 38, 3) +
        line(360, y + 10, 890, y + 10, "#EDF2F7", 18);
      if (s.current !== null)
        body += line(
          360,
          y + 6,
          360 + (s.current / max) * 530,
          y + 6,
          a.theme.current,
          9,
        );
      if (s.target !== null)
        body += line(
          360,
          y + 18,
          360 + (s.target / max) * 530,
          y + 18,
          a.theme.target,
          5,
          "7 3",
        );
      body += text(
        `${fmt(s.current)} / ${fmt(s.target)}`,
        970,
        y + 12,
        13,
        'text-anchor="end"',
      );
      y += 85;
    }
    return {
      svg: wrapper("Executive domain overview", body, Math.max(320, y + 20)),
      note: "Current / target domain means. Each average excludes unassessed and inapplicable values. The summary cards use the same filters.",
      pages: 1,
    };
  }
  const series = [
    ...a.snapshots.map((s) => ({
      label: s.label,
      date: s.date,
      a: s.assessment,
    })),
    { label: "Current assessment", date: a.date, a },
  ].sort((x, y) => x.date.localeCompare(y.date));
  const scope = o.historyScope;
  const values = series.map((s) => {
    const items = scope.startsWith("cap:")
      ? s.a.capabilities.filter((c) => c.id === scope.slice(4))
      : scope
        ? s.a.capabilities.filter((c) => c.domainId === scope)
        : s.a.capabilities;
    return { ...s, value: stats(s.a, items).current, max: s.a.levels.length };
  });
  let body = text("Historical maturity comparison", 25, 35, 22);
  const cx = (i: number) => 100 + (i * 800) / Math.max(1, values.length - 1);
  for (let k = 0; k <= 5; k++)
    body +=
      line(80, 420 - k * 65, 930, 420 - k * 65) +
      text(`${k * 20}%`, 25, 425 - k * 65, 11);
  const pp = values.map((s, i) =>
    s.value === null ? null : { x: cx(i), y: 420 - (s.value / s.max) * 325 },
  );
  pp.forEach((p, i) => {
    const prev = pp[i - 1];
    if (p && prev) body += line(prev.x, prev.y, p.x, p.y, a.theme.current, 3);
    if (p)
      body +=
        `<circle cx="${p.x}" cy="${p.y}" r="7" fill="${a.theme.current}"/>` +
        text(
          `${fmt(values[i].value)} / ${values[i].max}`,
          p.x,
          p.y - 18,
          13,
          'text-anchor="middle"',
        );
    body += lines(
      `${values[i].date} ${values[i].label}`,
      cx(i),
      458,
      11,
      "middle",
      18,
      3,
    );
  });
  return {
    svg: wrapper("Historical maturity comparison", body, 540),
    note: "Snapshots are independent copies. Plot shows mean / original scale maximum as a percentage, with original numeric scores beside each point. Changed scales or frameworks can limit comparability. Missing capabilities are excluded at each date.",
    pages: 1,
  };
}
