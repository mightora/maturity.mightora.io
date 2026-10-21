import { mkdir, readFile, writeFile } from "node:fs/promises";
import { template } from "../src/templates.ts";
import { buildPptx, buildDocx } from "../src/exports.ts";
import { validate } from "../src/engine.ts";
import { exportCsv } from "../src/transfer.ts";
await mkdir("examples", { recursive: true });
const project = validate(
  process.argv.includes("--refresh")
    ? template("power", true)
    : JSON.parse(
        await readFile(
          "examples/power-platform-governance.maturity.json",
          "utf8",
        ),
      ),
);
await writeFile(
  "examples/power-platform-governance.maturity.json",
  JSON.stringify(project, null, 2),
);
await writeFile("examples/power-platform-governance.csv", exportCsv(project));
for (const [name, blob] of [
  ["maturity-assessment-example.pptx", await buildPptx(project)],
  ["maturity-assessment-example.docx", await buildDocx(project)],
] as const)
  await writeFile("examples/" + name, new Uint8Array(await blob.arrayBuffer()));
console.log(
  "Generated editable PowerPoint and Word reports plus complete JSON and capability CSV from the application export services.",
);
