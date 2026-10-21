import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { buildPptx, buildDocx } from "../src/exports.ts";
import { template } from "../src/templates.ts";
import { clone, uid } from "../src/model.ts";
const zipBlob = async (b: Blob) => JSZip.loadAsync(await b.arrayBuffer());
test("real PowerPoint includes native radar/bar charts embedded editable workbooks and capability text", async () => {
  const a = template("power", true);
  a.capabilities[0].name = "Énergie & <governance> 名";
  const zip = await zipBlob(await buildPptx(a, { details: false }));
  const names = Object.keys(zip.files),
    charts = names.filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)),
    xlsx = names.filter((n) => /^ppt\/embeddings\/.*\.xlsx$/.test(n));
  assert(charts.length >= 3);
  assert.equal(charts.length, xlsx.length);
  const chartXml = (
    await Promise.all(charts.map((n) => zip.file(n)!.async("string")))
  ).join("");
  assert(chartXml.includes("<c:radarChart>"));
  assert(chartXml.includes("<c:barChart>"));
  assert(chartXml.includes("<c:externalData"));
  assert(chartXml.includes("Énergie &amp; &lt;governance&gt; 名"));
  assert(chartXml.includes('val="dash"'));
  const workbook = await JSZip.loadAsync(
    await zip.file(xlsx[0])!.async("uint8array"),
  );
  const sheet = await workbook
    .file("xl/worksheets/sheet1.xml")!
    .async("string");
  assert(sheet.includes("<v>2</v>"));
  assert(sheet.includes("<v>5</v>"));
  const slideXml = (
    await Promise.all(
      names
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .map((n) => zip.file(n)!.async("string")),
    )
  ).join("");
  assert(slideXml.includes("<a:tbl>"));
  assert(slideXml.includes("<a:t>Executive summary</a:t>"));
  assert(
    !names.some((n) => n.includes("/media/") && !zip.files[n].dir),
    "No screenshots used for Office evidence",
  );
});
test("missing and not-applicable PowerPoint scores remain blank rather than numeric zero", async () => {
  const a = template("power", true);
  a.capabilities[0].current = null;
  a.capabilities[1].current = "NA";
  const zip = await zipBlob(await buildPptx(a, { details: false }));
  const chartName = Object.keys(zip.files).find((n) =>
    /^ppt\/charts\/chart\d+\.xml$/.test(n),
  )!;
  const chart = await zip.file(chartName)!.async("string");
  const series = /<c:ser>[\s\S]*?<\/c:ser>/.exec(chart)![0];
  const cache = /<c:numCache>[\s\S]*?<\/c:numCache>/.exec(series)![0];
  assert(!cache.includes('<c:pt idx="0">'));
  assert(!cache.includes('<c:pt idx="1">'));
  const workbook = await JSZip.loadAsync(
    await zip
      .file(Object.keys(zip.files).find((n) => n.endsWith(".xlsx"))!)!
      .async("uint8array"),
  );
  const sheets = Object.keys(workbook.files).filter(
    (n) => n.startsWith("xl/worksheets/sheet") && n.endsWith(".xml"),
  );
  const sheet = await workbook.file(sheets[0])!.async("string");
  assert(!sheet.includes("null"));
  assert(!sheet.includes("NaN"));
});
test("real Word report uses editable tables headings TOC header/footer and Unicode text", async () => {
  const a = template("power", true);
  a.capabilities[0].name = "Énergie & <security> 名";
  a.capabilities[0].evidence = "Evidence with Unicode £ € and a long label";
  const zip = await zipBlob(await buildDocx(a));
  const document = await zip.file("word/document.xml")!.async("string");
  assert(document.includes("<w:tbl>"));
  assert(document.includes("Énergie &amp; &lt;security&gt; 名"));
  assert(document.includes("Evidence with Unicode"));
  assert(document.includes("TOC"));
  assert(document.includes("editable alternative"));
  assert(document.includes("w:tblHeader"));
  assert(document.includes('w:pStyle w:val="Heading1"'));
  assert(Object.keys(zip.files).some((n) => /^word\/header\d+\.xml$/.test(n)));
  assert(Object.keys(zip.files).some((n) => /^word\/footer\d+\.xml$/.test(n)));
  assert(!Object.keys(zip.files).some((n) => n.includes("/media/")));
});
test("Office generation retains large datasets and multiple domains", async () => {
  const a = template("power", true),
    base = clone(a.capabilities[0]);
  a.capabilities = Array.from({ length: 80 }, (_, i) => ({
    ...clone(base),
    id: uid(),
    domainId: a.domains[i % 4].id,
    groupId: a.domains[i % 4].groups[0].id,
    name: `Large capability ${i} with a meaningful descriptive label`,
    criteria: [],
  }));
  const ppt = await zipBlob(
    await buildPptx(a, { details: false, aspect: "standard", preset: "plain" }),
  );
  const text = (
    await Promise.all(
      Object.keys(ppt.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .map((n) => ppt.file(n)!.async("string")),
    )
  ).join("");
  assert(text.includes("Large capability 79"));
  assert(text.includes("Prioritised improvements"));
  const word = await zipBlob(await buildDocx(a));
  assert(
    (await word.file("word/document.xml")!.async("string")).includes(
      "Large capability 79",
    ),
  );
});
test("offline ZIP includes byte-identical standalone HTML and required licence/readme", async () => {
  const [zipData, html] = await Promise.all([
    readFile("dist/maturity-offline.zip"),
    readFile("dist/offline.html", "utf8"),
  ]);
  const zip = await JSZip.loadAsync(zipData);
  assert.equal(await zip.file("index.html")!.async("string"), html);
  assert(zip.file("LICENSE"));
  assert(zip.file("README.md"));
  assert(html.includes("Offline Edition – No Internet Connection Required"));
  assert(html.includes("connect-src 'none'"));
  assert(!/<(?:script|img)[^>]+src="https?:/.test(html));
  assert(!/<link[^>]+href="https?:/.test(html));
});
