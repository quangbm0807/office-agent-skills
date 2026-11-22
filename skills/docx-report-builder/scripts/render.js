#!/usr/bin/env node
// Render an Office file to PDF and one PNG per page/slide so you can look at the result.
//
//   node render.js <file.pptx|.docx|.xlsx|.pdf> [outDir] [--dpi 80]
//
// Output: <outDir>/<name>.pdf and <outDir>/<name>-<n>.png (n = 1, 2, ...).
// Needs LibreOffice (soffice) for Office files and Poppler (pdftoppm) for PNGs.
// Works on Windows, macOS and Linux. If pdftoppm is missing you still get the PDF.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function which(cmd) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.split(/\r?\n/)[0].trim();
  return null;
}

function findSoffice() {
  const env = process.env.SOFFICE_PATH;
  if (env && fs.existsSync(env)) return env;
  for (const c of ["soffice", "libreoffice"]) {
    const p = which(c);
    if (p) return p;
  }
  const candidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/opt/libreoffice/program/soffice",
    "/snap/bin/libreoffice",
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function main() {
  const args = process.argv.slice(2);
  const dpiIdx = args.indexOf("--dpi");
  const dpi = dpiIdx >= 0 ? Number(args.splice(dpiIdx, 2)[1]) || 80 : 80;
  const [input, outDirArg] = args;
  if (!input) {
    console.error("Usage: node render.js <file.pptx|.docx|.xlsx|.pdf> [outDir] [--dpi 80]");
    process.exit(1);
  }
  const src = path.resolve(input);
  if (!fs.existsSync(src)) {
    console.error("File not found: " + src);
    process.exit(1);
  }
  const base = path.basename(src, path.extname(src));
  const outDir = path.resolve(outDirArg || path.join(path.dirname(src), base + "_render"));
  fs.mkdirSync(outDir, { recursive: true });

  let pdf = src;
  if (path.extname(src).toLowerCase() !== ".pdf") {
    const soffice = findSoffice();
    if (!soffice) {
      console.error("LibreOffice not found. Install it (https://www.libreoffice.org) or set SOFFICE_PATH.");
      process.exit(2);
    }
    // A private profile avoids clashes with an open LibreOffice window and first-run dialogs.
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lo-profile-"));
    const profileUrl = "file:///" + profile.replace(/\\/g, "/").replace(/^\/+/, "");
    const r = spawnSync(soffice, [`-env:UserInstallation=${profileUrl}`, "--headless", "--convert-to", "pdf", "--outdir", outDir, src], { encoding: "utf8", timeout: 180000 });
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    pdf = path.join(outDir, base + ".pdf");
    if (r.status !== 0 || !fs.existsSync(pdf)) {
      console.error("LibreOffice conversion failed.\n" + (r.stderr || r.stdout || (r.error && r.error.message) || ""));
      process.exit(3);
    }
  }
  console.log("PDF: " + pdf);

  const pdftoppm = process.env.PDFTOPPM_PATH || which("pdftoppm");
  if (!pdftoppm) {
    console.log("pdftoppm (Poppler) not found — PNGs skipped. Open the PDF instead, or install Poppler.");
    return;
  }
  for (const f of fs.readdirSync(outDir)) if (f.startsWith(base + "-") && f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
  const r2 = spawnSync(pdftoppm, ["-png", "-r", String(dpi), pdf, path.join(outDir, base)], { encoding: "utf8", timeout: 180000 });
  if (r2.status !== 0) {
    console.error("pdftoppm failed: " + (r2.stderr || ""));
    process.exit(4);
  }
  // pdftoppm pads page numbers (deck-01.png); normalise to deck-1.png.
  const pngs = fs.readdirSync(outDir)
    .filter((f) => f.startsWith(base + "-") && f.endsWith(".png"))
    .map((f) => {
      const n = Number(f.slice(base.length + 1, -4));
      const target = `${base}-${n}.png`;
      if (f !== target) fs.renameSync(path.join(outDir, f), path.join(outDir, target));
      return { n, file: path.join(outDir, target) };
    })
    .sort((a, b) => a.n - b.n);
  console.log(`PNG (${pngs.length}):`);
  for (const p of pngs) console.log("  " + p.file);
}

main();
