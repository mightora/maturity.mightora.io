import {
  readFile,
  readdir,
  mkdir,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
await mkdir("release", { recursive: true });
const skip = new Set([
  "node_modules",
  ".git",
  "dist",
  "release",
  "test-results",
  "playwright-report",
  "qa",
]);
const zip = new JSZip();
async function add(dir = "") {
  for (const entry of await readdir(dir || ".", { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await add(path);
    else zip.file("maturity.mightora.io/" + path, await readFile(path));
  }
}
await add();
await writeFile(
  "release/mightora-maturity-source.zip",
  await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
await copyFile("dist/offline.html", "release/maturity-offline.html");
await copyFile("dist/maturity-offline.zip", "release/maturity-offline.zip");
await copyFile("dist/maturity-samples.zip", "release/maturity-samples.zip");
for (const name of [
  "maturity-assessment-example.docx",
  "maturity-assessment-example.pptx",
])
  await copyFile("examples/" + name, "release/" + name);
await copyFile(
  "examples/power-platform-governance.maturity.json",
  "release/power-platform-governance.maturity.json",
);
console.log(
  "Packaged source, offline edition, sample project and editable Office documents.",
);
