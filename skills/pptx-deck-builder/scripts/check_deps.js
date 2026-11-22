#!/usr/bin/env node
// Check that everything this skill needs is installed and print how to fix what is missing.
//   node check_deps.js
const { spawnSync } = require("child_process");
const fs = require("fs");
const { requireDep } = require("./_deps");

const REQUIRED = ["pptxgenjs", "sharp"];
const OPTIONAL = { react: "icons", "react-dom/server": "icons", "react-icons/fa": "icons" };

const ok = (m) => console.log("  OK       " + m);
const bad = (m) => console.log("  MISSING  " + m);
const opt = (m) => console.log("  optional " + m);

let failed = false;
const major = Number(process.versions.node.split(".")[0]);
console.log("Node.js");
if (major >= 18) ok("node " + process.versions.node);
else { bad(`node ${process.versions.node} (need 18+)`); failed = true; }

console.log("npm packages");
const missing = [];
for (const p of REQUIRED) {
  try { requireDep(p); ok(p); } catch { bad(p); missing.push(p); failed = true; }
}
const missingOpt = new Set();
for (const [p, why] of Object.entries(OPTIONAL)) {
  try { requireDep(p); ok(p); } catch { opt(`${p} (needed for ${why})`); missingOpt.add(p.split("/")[0]); }
}

console.log("Render tools (for checking the result visually)");
const has = (cmd) => spawnSync(process.platform === "win32" ? "where" : "which", [cmd]).status === 0;
const soffice = has("soffice") || has("libreoffice") || [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
].some((p) => fs.existsSync(p));
soffice ? ok("LibreOffice (soffice)") : opt("LibreOffice — https://www.libreoffice.org/download/");
has("pdftoppm") ? ok("pdftoppm (Poppler)") : opt("pdftoppm — Windows: `winget install oschwartz10612.Poppler` or MiKTeX; macOS: `brew install poppler`; Linux: `apt install poppler-utils`");

const toInstall = [...missing, ...missingOpt];
if (toInstall.length) {
  console.log("\nInstall with (in your project folder):");
  console.log("  npm install " + toInstall.join(" "));
  console.log("or globally:");
  console.log("  npm install -g " + toInstall.join(" "));
}
process.exit(failed ? 1 : 0);
