import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  TableOfContents,
  PageBreak,
  ShadingType,
  type FileChild,
} from "docx";
import {
  type Assessment,
  type Capability,
  type Score,
  scoreText,
  numeric,
  gap,
  fmt,
  domainName,
  groupName,
  xml,
} from "./model.ts";
import { stats, improvements, methodology } from "./engine.ts";
export interface ReportOptions {
  preset: string;
  font: string;
  aspect: "wide" | "standard";
  details: boolean;
  primary: string;
  accent: string;
}
export const REPORT_THEMES: Record<
  string,
  { ink: string; accent: string; paper: string }
> = {
  mightora: { ink: "102A43", accent: "B44D2E", paper: "F7F9FB" },
  plain: { ink: "222222", accent: "1769AA", paper: "FFFFFF" },
  ocean: { ink: "163C56", accent: "087E8B", paper: "F4FAFC" },
  forest: { ink: "244A38", accent: "8A4B21", paper: "F5F9F4" },
};
export const DEFAULT_REPORT: ReportOptions = {
  preset: "mightora",
  font: "Arial",
  aspect: "wide",
  details: true,
  primary: "#102A43",
  accent: "#B44D2E",
};
const chunks = <T>(list: T[], size: number) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  );
const clean = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
const sentences = (s: string, max = 900) => {
  const out: string[] = [];
  let remaining = s.trim();
  while (remaining.length > max) {
    const boundary = remaining.lastIndexOf(" ", max);
    const end = boundary > max * 0.6 ? boundary : max;
    out.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) out.push(remaining);
  return out.length ? out : ["Not recorded."];
};
/** Native radar/bar charts with embedded XLSX workbooks, native text and tables. */
export async function buildPptx(
  a: Assessment,
  options: Partial<ReportOptions> = {},
): Promise<Blob> {
  const o = { ...DEFAULT_REPORT, ...options },
    theme = REPORT_THEMES[o.preset] ?? {
      ink: o.primary.slice(1),
      accent: o.accent.slice(1),
      paper: "FFFFFF",
    };
  const PptxConstructor: typeof PptxGenJS =
    (PptxGenJS as unknown as { default?: typeof PptxGenJS }).default ??
    PptxGenJS;
  const pptx = new PptxConstructor();
  pptx.layout = o.aspect === "wide" ? "LAYOUT_WIDE" : "LAYOUT_4x3";
  const width = o.aspect === "wide" ? 13.333 : 10;
  const height = 7.5;
  const inner = width - 1.2;
  pptx.author = a.owner || "Mightora";
  pptx.subject = "Capability maturity assessment";
  pptx.title = a.title;
  pptx.company = a.organisation;
  pptx.theme = { headFontFace: o.font, bodyFontFace: o.font };
  let slideCount = 0;
  const add = (heading: string, kicker = "MIGHTORA MATURITY ASSESSMENT") => {
    const s = pptx.addSlide();
    slideCount++;
    s.background = { color: theme.paper };
    s.addText(kicker, {
      x: 0.6,
      y: 0.32,
      w: inner,
      h: 0.25,
      fontSize: 10,
      color: theme.accent,
      fontFace: o.font,
      bold: true,
      margin: 0,
    });
    s.addText(clean(heading), {
      x: 0.6,
      y: 0.85,
      w: inner,
      h: 0.75,
      fontSize: 27,
      color: theme.ink,
      fontFace: o.font,
      bold: true,
      margin: 0,
      fit: "shrink",
    });
    s.addText(`${a.date}    ${a.assessmentVersion}    ${slideCount}`, {
      x: 0.6,
      y: 7.1,
      w: inner,
      h: 0.2,
      fontSize: 9,
      color: "486581",
      fontFace: o.font,
      margin: 0,
    });
    return s;
  };
  const prose = (
    s: PptxGenJS.Slide,
    value: string,
    y = 1.9,
    h = 4.7,
    fontSize = 19,
  ) =>
    s.addText(clean(value), {
      x: 0.7,
      y,
      w: inner - 0.2,
      h,
      fontSize,
      fontFace: o.font,
      color: theme.ink,
      margin: 0,
      breakLine: false,
      fit: "shrink",
      valign: "top",
    });
  const paginateTable = (rows: unknown[][], ratios: number[]) => {
    const pages: unknown[][][] = [];
    let page: unknown[][] = [],
      height = 0;
    for (const row of rows) {
      const lines = Math.max(
        ...row.map((value, i) =>
          String(value ?? "")
            .split("\n")
            .reduce(
              (sum, line) =>
                sum +
                Math.max(
                  1,
                  Math.ceil(
                    line.length /
                      Math.max(6, inner * (ratios[i] ?? 1 / row.length) * 10),
                  ),
                ),
              0,
            ),
        ),
      );
      const rowHeight = Math.max(0.55, lines * 0.23 + 0.18);
      if (page.length && height + rowHeight > 4.35) {
        pages.push(page);
        page = [];
        height = 0;
      }
      page.push(row);
      height += rowHeight;
    }
    if (page.length) pages.push(page);
    return pages;
  };
  const tables = (
    title: string,
    heads: string[],
    rows: unknown[][],
    sizes?: number[],
  ) => {
    const widths = sizes ?? heads.map(() => 1 / heads.length);
    for (const [i, batch] of paginateTable(rows, widths).entries()) {
      const s = add(title + (i ? " continued" : ""));
      s.addTable(
        [
          heads.map((text) => ({
            text,
            options: {
              bold: true,
              color: "FFFFFF",
              fill: { color: theme.ink },
            },
          })),
          ...batch.map((row) =>
            row.map((v) => ({
              text: clean(String(v ?? "")),
              options: { color: theme.ink, fill: { color: "FFFFFF" } },
            })),
          ),
        ],
        {
          x: 0.6,
          y: 1.8,
          w: inner,
          border: { type: "solid", pt: 0.5, color: "D9E2EC" },
          fontFace: o.font,
          fontSize: 12,
          margin: 0.1,
          colW: widths.map((v) => inner * v),
          rowH: 0.55,
          autoPage: false,
          verbose: false,
        },
      );
    }
  };

  const s = stats(a);
  let slide = add(a.title, "MIGHTORA");
  prose(
    slide,
    [
      a.organisation || "Capability maturity assessment",
      a.description.slice(0, 260) + (a.description.length > 260 ? "…" : ""),
      a.owner ? `Assessment owner: ${a.owner}` : "",
      `Assessment: ${a.date}    Version: ${a.assessmentVersion}`,
      `Framework: ${a.framework}`,
      a.reviewDate ? `Review date: ${a.reviewDate}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    2,
    4.4,
    21,
  );
  if (a.description.length > 260)
    for (const part of sentences(a.description, 950)) {
      slide = add("Assessment context");
      prose(slide, part, 1.9, 4.8, 18);
    }
  slide = add("Executive summary");
  prose(
    slide,
    `${s.assessed} of ${s.total} capabilities assessed\nCurrent maturity ${fmt(s.current)} / ${a.levels.length}\nTarget maturity ${fmt(s.target)} / ${a.levels.length}\n${s.attention} capabilities require attention\n${s.notApplicable} not applicable, ${s.unassessed} not assessed\n\nScores describe the evidence recorded in this assessment. Priorities and risks guide the improvement sequence.`,
    1.9,
    4.8,
    23,
  );
  for (const [i, caps] of chunks(a.capabilities, 12).entries()) {
    slide = add(
      `Overall capability maturity radar${a.capabilities.length > 12 ? ` ${i + 1}` : ""}`,
    );
    if (caps.length < 3) {
      prose(
        slide,
        "A radar requires at least three axes. The current versus target tables contain every capability and score.",
      );
      continue;
    }
    const labels = caps.map((c) =>
      c.name.length > 48 ? c.name.slice(0, 47) + "…" : c.name,
    );
    slide.addChart(
      pptx.ChartType.radar,
      [
        {
          name: "Current",
          labels,
          values: caps.map((c) =>
            numeric(c.current) ? c.current : null,
          ) as number[],
        },
        {
          name: "Target",
          labels,
          values: caps.map((c) =>
            numeric(c.target) ? c.target : null,
          ) as number[],
        },
      ],
      {
        x: 0.65,
        y: 1.65,
        w: inner - 0.1,
        h: 5.2,
        catAxisLabelFontFace: o.font,
        catAxisLabelFontSize: 11,
        valAxisMinVal: 0,
        valAxisMaxVal: a.levels.length,
        valAxisMajorUnit: 1,
        valAxisLabelFontSize: 10,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 12,
        showValue: false,
        chartColors: [a.theme.current.slice(1), a.theme.target.slice(1)],
        showTitle: false,
        radarStyle: "marker",
        lineSize: 2,
        lineDataSymbol: "circle",
        lineDataSymbolSize: 5,
        displayBlanksAs: "gap",
      },
    );
    slide.addNotes(
      "Native editable Office radar with an embedded Excel workbook. Missing or inapplicable scores are blank cells, never zero. Chart labels over 48 characters are abbreviated. Full names and assessment states appear in the detailed score tables.",
    );
  }
  tables(
    "Domain maturity summary",
    ["Domain", "Assessed", "Current", "Target"],
    a.domains.map((d) => {
      const ds = stats(
        a,
        a.capabilities.filter((c) => c.domainId === d.id),
      );
      return [
        d.name,
        `${ds.assessed} / ${ds.total}`,
        fmt(ds.current),
        fmt(ds.target),
      ];
    }),
    [0.44, 0.16, 0.2, 0.2],
  );
  let heatmapOffset = 0;
  const heatmapBatches = paginateTable(
    a.capabilities.map((c) => [
      c.name,
      domainName(a, c),
      scoreText(c.current),
      scoreText(c.target),
    ]),
    [0.4, 0.27, 0.17, 0.16],
  );
  for (const batch of heatmapBatches) {
    const caps = a.capabilities.slice(
      heatmapOffset,
      heatmapOffset + batch.length,
    );
    heatmapOffset += batch.length;
    slide = add("Capability maturity heatmap");
    slide.addTable(
      [
        ["Capability", "Domain", "Current", "Target"].map((text) => ({
          text,
          options: { bold: true, color: "FFFFFF", fill: { color: theme.ink } },
        })),
        ...caps.map((c) => [
          { text: c.name },
          { text: domainName(a, c) },
          {
            text: scoreText(c.current),
            options: {
              fill: {
                color: numeric(c.current)
                  ? a.levels[c.current - 1].color.slice(1)
                  : "EDF2F7",
              },
            },
          },
          { text: scoreText(c.target) },
        ]),
      ],
      {
        x: 0.6,
        y: 1.8,
        w: inner,
        rowH: 0.55,
        colW: [inner * 0.4, inner * 0.27, inner * 0.17, inner * 0.16],
        fontSize: 11,
        fontFace: o.font,
        margin: 0.08,
        border: { pt: 0.5, color: "D9E2EC" },
        autoPage: false,
      },
    );
  }
  for (const domain of a.domains)
    for (const caps of chunks(
      a.capabilities.filter((c) => c.domainId === domain.id),
      8,
    )) {
      slide = add(`${domain.name} current versus target`);
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Current",
            labels: caps.map((c) =>
              c.name.length > 48 ? c.name.slice(0, 47) + "…" : c.name,
            ),
            values: caps.map((c) =>
              numeric(c.current) ? c.current : null,
            ) as number[],
          },
          {
            name: "Target",
            labels: caps.map((c) =>
              c.name.length > 48 ? c.name.slice(0, 47) + "…" : c.name,
            ),
            values: caps.map((c) =>
              numeric(c.target) ? c.target : null,
            ) as number[],
          },
        ],
        {
          x: 0.6,
          y: 1.7,
          w: inner,
          h: 5.2,
          barDir: "bar",
          barGrouping: "clustered",
          catAxisLabelFontSize: 11,
          valAxisMinVal: 0,
          valAxisMaxVal: a.levels.length,
          valAxisMajorUnit: 1,
          showLegend: true,
          legendPos: "b",
          showValue: true,
          chartColors: [a.theme.current.slice(1), a.theme.target.slice(1)],
          displayBlanksAs: "gap",
        },
      );
    }
  tables(
    "Capability gaps",
    ["Capability", "Current", "Target", "Gap", "Priority"],
    improvements(a.capabilities, "gap").map((c) => [
      c.name,
      scoreText(c.current),
      scoreText(c.target),
      gap(c) ?? "Unpaired",
      c.priority,
    ]),
    [0.37, 0.2, 0.2, 0.1, 0.13],
  );
  tables(
    "Prioritised improvements",
    [
      "Capability",
      "Priority / weight",
      "Owner / target date",
      "Recommendation",
    ],
    improvements(a.capabilities).map((c) => [
      c.name,
      `${c.priority} / ${c.weight}`,
      `${c.owner || "Unassigned"}\n${c.due || "No target date"}`,
      c.recommendations.length > 220
        ? c.recommendations.slice(0, 219) + "… (full text in details / JSON)"
        : c.recommendations || "Not recorded",
    ]),
    [0.23, 0.14, 0.23, 0.4],
  );
  if (a.snapshots.length)
    tables(
      "Historical comparison",
      ["Snapshot", "Date", "Current / original max", "Assessed"],
      [
        ...a.snapshots.map((v) => [
          v.label,
          v.date,
          `${fmt(stats(v.assessment).current)} / ${v.assessment.levels.length}`,
          stats(v.assessment).assessed,
        ]),
        [
          "Current assessment",
          a.date,
          `${fmt(s.current)} / ${a.levels.length}`,
          s.assessed,
        ],
      ],
      [0.32, 0.2, 0.3, 0.18],
    );
  if (o.details)
    for (const c of a.capabilities) {
      const sections = [
        `${domainName(a, c)}${groupName(a, c) ? ` / ${groupName(a, c)}` : ""}`,
        c.description,
        `Current: ${scoreText(c.current, a)}\nTarget: ${scoreText(c.target, a)}\nGap: ${gap(c) ?? "Unpaired"}    Priority: ${c.priority}    Weight: ${c.weight}`,
        `Owner: ${c.owner || "Unassigned"}    Target date: ${c.due || "Not set"}`,
        `Evidence\n${c.evidence || "Not recorded."}`,
        `Recommendations\n${c.recommendations || "Not recorded."}`,
        c.risks ? `Risks and issues\n${c.risks}` : "",
        c.notes ? `Notes\n${c.notes}` : "",
        c.criteria.length
          ? `Assessment criteria\n${c.criteria.map((r) => `${r.met ? "Met" : "Not confirmed"}: ${r.text}\nEvidence: ${r.evidence || "Not recorded"}`).join("\n\n")}`
          : "",
      ].filter(Boolean);
      const textPages: string[] = [];
      let pageSections: string[] = [],
        usedLines = 0;
      const charsPerLine = Math.floor((inner * 72) / (17 * 0.52));
      for (const section of sections) {
        for (const part of sentences(section, charsPerLine * 14)) {
          const lineCount = part
            .split("\n")
            .reduce(
              (sum, line) =>
                sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
              0,
            );
          if (pageSections.length && usedLines + lineCount + 1 > 17) {
            textPages.push(pageSections.join("\n\n"));
            pageSections = [];
            usedLines = 0;
          }
          pageSections.push(part);
          usedLines += lineCount + 1;
        }
      }
      if (pageSections.length) textPages.push(pageSections.join("\n\n"));
      for (const [i, part] of textPages.entries()) {
        slide = add(c.name + (i ? " continued" : ""), "CAPABILITY DETAILS");
        prose(slide, part, 1.85, 4.95, 17);
      }
    }
  slide = add("Assessment methodology");
  prose(slide, methodology(a), 1.9, 4.8, 18);
  tables(
    "Maturity level definitions",
    ["Level", "Name", "Definition"],
    a.levels.map((l) => [l.value, l.name, l.description]),
    [0.1, 0.22, 0.68],
  );
  // Sparse chart caches must omit empty points. The workbook cells remain blank.
  const output = (await pptx.write({
    outputType: "arraybuffer",
  })) as ArrayBuffer;
  const zip = await JSZip.loadAsync(output);
  for (const name of Object.keys(zip.files).filter((n) =>
    /^ppt\/charts\/chart\d+\.xml$/.test(n),
  )) {
    let chart = await zip.file(name)!.async("string");
    chart = chart.replace(/<c:pt idx="\d+"><c:v><\/c:v><\/c:pt>/g, "");
    let index = 0;
    chart = chart.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, (series) => {
      const dash = index++ % 2 === 1 ? "dash" : "solid";
      return series.replace(
        /<a:prstDash val="solid"\/>/g,
        `<a:prstDash val="${dash}"/>`,
      );
    });
    zip.file(name, chart);
  }
  const contentTypes = await zip.file("[Content_Types].xml")!.async("string");
  zip.file(
    "[Content_Types].xml",
    contentTypes.replace(
      /<Override\b[^>]*PartName="([^"]+)"[^>]*\/>/g,
      (entry, path: string) => (zip.file(path.replace(/^\//, "")) ? entry : ""),
    ),
  );
  return new Blob(
    [
      (await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
      })) as BlobPart,
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  );
}
/** Word uses explicitly labelled native editable comparison tables, not an image radar. */
export async function buildDocx(
  a: Assessment,
  options: Partial<ReportOptions> = {},
): Promise<Blob> {
  const o = { ...DEFAULT_REPORT, ...options },
    s = stats(a);
  const h = (
    text: string,
    level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
  ) =>
    new Paragraph({
      text: clean(text),
      heading: level,
      spacing: { before: 260, after: 140 },
      keepNext: true,
    });
  const p = (text: string) =>
    new Paragraph({
      children: clean(text)
        .split("\n")
        .map((t, i) => new TextRun({ text: t, break: i ? 1 : 0 })),
      spacing: { after: 120 },
    });
  const table = (headers: string[], rows: unknown[][], widths: number[]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: widths,
      rows: [headers, ...rows].map(
        (row, i) =>
          new TableRow({
            tableHeader: i === 0,
            cantSplit: true,
            children: row.map(
              (value, j) =>
                new TableCell({
                  width: { size: widths[j], type: WidthType.DXA },
                  shading:
                    i === 0
                      ? { fill: "E8EEF3", type: ShadingType.CLEAR }
                      : undefined,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: clean(String(value ?? "")),
                          bold: i === 0,
                          color: "000000",
                          size: 20,
                        }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
            ),
          }),
      ),
    });
  const children: FileChild[] = [
    new Paragraph({
      text: clean(a.title),
      heading: HeadingLevel.TITLE,
      spacing: { before: 1400, after: 400 },
    }),
    p(a.organisation || "Capability maturity assessment"),
    p(
      a.description ||
        "Assessment of current practices and target capability maturity.",
    ),
    p(
      `Assessment date: ${a.date}\nOwner: ${a.owner || "Not recorded"}\nVersion: ${a.assessmentVersion}\nFramework: ${a.framework}\nReview date: ${a.reviewDate || "Not set"}`,
    ),
    p("Mightora Maturity Assessment"),
    new Paragraph({ children: [new PageBreak()] }),
    h("Contents"),
    new TableOfContents("Contents", {
      hyperlink: true,
      headingStyleRange: "1-2",
    }),
    p(
      "In Word, right-click the contents field and choose Update Field to refresh page numbers.",
    ),
    new Paragraph({ children: [new PageBreak()] }),
    h("Executive summary"),
    p(
      `${s.assessed} of ${s.total} capabilities have numeric current scores. Overall current maturity is ${fmt(s.current)} out of ${a.levels.length}, with target maturity ${fmt(s.target)}. ${s.attention} capabilities require attention based on recorded risks, high priority gaps or a gap of at least two levels. ${s.notApplicable} capabilities are not applicable and ${s.unassessed} are not assessed.`,
    ),
    h("Assessment methodology"),
    p(methodology(a)),
    table(
      ["Level", "Name", "Definition"],
      a.levels.map((l) => [l.value, l.name, l.description]),
      [900, 1900, 6400],
    ),
    h("Domain overview"),
    table(
      ["Domain", "Assessed", "Current", "Target"],
      a.domains.map((d) => {
        const ds = stats(
          a,
          a.capabilities.filter((c) => c.domainId === d.id),
        );
        return [
          d.name,
          `${ds.assessed}/${ds.total}`,
          fmt(ds.current),
          fmt(ds.target),
        ];
      }),
      [4000, 1600, 1800, 1800],
    ),
    h("Editable maturity comparison"),
    p(
      "The following native Word tables are the editable alternative to a radar chart. Individual scores, labels and explanations can be edited directly. This report does not contain an editable radar chart. Native editable radar charts with embedded data are available in the PowerPoint export.",
    ),
  ];
  for (const d of a.domains) {
    const caps = a.capabilities.filter((c) => c.domainId === d.id);
    children.push(
      h(d.name, HeadingLevel.HEADING_2),
      table(
        ["Capability", "Current", "Target", "Gap"],
        caps.map((c) => [
          c.name,
          scoreText(c.current),
          scoreText(c.target),
          gap(c) ?? "Unpaired",
        ]),
        [4200, 1850, 1850, 1300],
      ),
    );
  }
  children.push(
    h("Improvement roadmap"),
    p(
      "Actions are ordered by business priority, then gap and capability weight. Review risk, cost and feasibility before committing to the sequence.",
    ),
    table(
      ["Capability", "Priority / weight", "Owner", "Target date"],
      improvements(a.capabilities).map((c) => [
        c.name,
        `${c.priority} / ${c.weight}`,
        c.owner || "Unassigned",
        c.due || "Not set",
      ]),
      [3800, 1600, 2500, 1300],
    ),
  );
  if (a.snapshots.length)
    children.push(
      h("Historical comparison"),
      p(
        "Each snapshot preserves its own maturity scale and capability set. Compare changed definitions with care.",
      ),
      table(
        ["Snapshot", "Date", "Current / original maximum"],
        a.snapshots.map((v) => [
          v.label,
          v.date,
          `${fmt(stats(v.assessment).current)} / ${v.assessment.levels.length}`,
        ]),
        [4000, 1800, 3400],
      ),
    );
  children.push(h("Capability evidence and recommendations"));
  for (const d of a.domains) {
    children.push(h(d.name, HeadingLevel.HEADING_2));
    for (const c of a.capabilities.filter((c) => c.domainId === d.id)) {
      children.push(
        h(c.name, HeadingLevel.HEADING_3),
        p(c.description),
        p(
          `Group: ${groupName(a, c) || "Ungrouped"}\nCurrent: ${scoreText(c.current, a)}    Target: ${scoreText(c.target, a)}\nGap: ${gap(c) ?? "Unpaired"}    Priority: ${c.priority}    Weight: ${c.weight}\nOwner: ${c.owner || "Unassigned"}    Target date: ${c.due || "Not set"}`,
        ),
      );
      for (const [label, value] of [
        ["Evidence and justification", c.evidence],
        ["Recommendations", c.recommendations],
        ["Risks and issues", c.risks],
        ["Supporting notes", c.notes],
      ])
        children.push(
          new Paragraph({
            children: [new TextRun({ text: label, bold: true })],
            keepNext: true,
            spacing: { before: 120, after: 60 },
          }),
          p(value || "Not recorded."),
        );
      if (c.criteria.length)
        children.push(
          table(
            ["Assessment criterion", "Status", "Evidence"],
            c.criteria.map((r) => [
              r.text,
              r.met ? "Met" : "Not confirmed",
              r.evidence || "Not recorded",
            ]),
            [4700, 1400, 3100],
          ),
        );
    }
  }
  children.push(h("Appendix framework guidance"));
  for (const l of a.levels)
    children.push(
      h(`${l.value} ${l.name}`, HeadingLevel.HEADING_2),
      p(l.description),
      p(
        `Scoring guidance: ${l.guidance || "Not specified"}\nEvidence requirements: ${l.evidence || "Not specified"}`,
      ),
    );
  children.push(
    h("Appendix stable capability identifiers"),
    table(
      ["Capability ID", "Capability", "Domain"],
      a.capabilities.map((c) => [c.id, c.name, domainName(a, c)]),
      [3000, 3400, 2800],
    ),
  );
  const document = new Document({
    creator: a.owner || "Mightora",
    title: a.title,
    description: "Editable assessment report",
    styles: {
      default: {
        document: {
          run: { font: o.font, size: 22, color: "000000" },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        title: { run: { font: o.font, size: 44, bold: true, color: "000000" } },
        heading1: {
          run: { font: o.font, size: 30, bold: true, color: "000000" },
        },
        heading2: {
          run: { font: o.font, size: 26, bold: true, color: "000000" },
        },
        heading3: {
          run: { font: o.font, size: 23, bold: true, color: "000000" },
        },
      },
    },
    features: { updateFields: true },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, right: 1200, bottom: 1000, left: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: "Mightora Maturity Assessment",
                style: "Header",
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${a.date}   ` }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(document);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  let documentXml = await zip.file("word/document.xml")!.async("string");
  const tocSections = [
    "Executive summary",
    "Assessment methodology",
    "Domain overview",
    "Editable maturity comparison",
    "Improvement roadmap",
    ...(a.snapshots.length ? ["Historical comparison"] : []),
    "Capability evidence and recommendations",
    "Appendix framework guidance",
    "Appendix stable capability identifiers",
  ];
  const cached = tocSections
    .map(
      (label) =>
        `<w:p><w:pPr><w:pStyle w:val="TOC1"/><w:spacing w:after="140"/></w:pPr><w:r><w:t>${xml(label)}</w:t></w:r></w:p>`,
    )
    .join("");
  documentXml = documentXml.replace(
    '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
    cached + '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
  );
  zip.file("word/document.xml", documentXml);
  return new Blob(
    [
      (await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
      })) as BlobPart,
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  );
}
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function pngFromSvg(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" }),
    url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not rasterise this SVG."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    const ratio = 2400 / Math.max(1, image.width);
    canvas.width = 2400;
    canvas.height = Math.min(16000, Math.ceil(image.height * ratio));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (v) => (v ? resolve(v) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
