#!/usr/bin/env node
// Pull the text and images out of a .docx so you can build slides from a report.
//
//   node extract_docx.js report.docx [outDir]
//
// Writes:
//   <outDir>/content.md   headings, paragraphs, lists and tables in reading order,
//                         with ![imageN](media/imageN.png) where each picture sits
//   <outDir>/images.json  every picture in order: file, size, the heading above it,
//                         and the caption next to it (paragraph starting with Hình/Figure/Bảng/Table)
//   <outDir>/media/       the image files themselves (EMF/WMF are copied as-is;
//                         convert them with LibreOffice if you need PNG)
const fs = require("fs");
const path = require("path");
const { readZip, requireDep } = require("./_deps");

const decode = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&");

function paraText(xml) {
  let out = "";
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) out += decode(m[1]);
    else if (m[0].startsWith("<w:tab")) out += "\t";
    else out += "\n";
  }
  return out;
}

function headingLevel(style) {
  if (!style) return 0;
  const s = style.toLowerCase().replace(/\s+/g, "");
  if (s === "title") return 1;
  const m = s.match(/^(?:heading|u|berschrift|titre|título|titolo)(\d)$/);
  return m ? Number(m[1]) : 0;
}

async function main() {
  const [input, outArg] = process.argv.slice(2);
  if (!input) {
    console.error("Usage: node extract_docx.js report.docx [outDir]");
    process.exit(1);
  }
  const zip = readZip(fs.readFileSync(input));
  const readText = (name) => { const b = zip.read(name); return b ? b.toString("utf8") : ""; };
  const outDir = path.resolve(outArg || path.basename(input, path.extname(input)) + "_extracted");
  const mediaDir = path.join(outDir, "media");
  fs.mkdirSync(mediaDir, { recursive: true });

  // relationship id -> media file name
  const relsXml = readText("word/_rels/document.xml.rels");
  const rels = {};
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g)) rels[m[1]] = m[2];
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"[^>]*\/?>/g)) rels[m[2]] = m[1];

  // copy media
  const mediaFiles = zip.names.filter((f) => f.startsWith("word/media/") && !f.endsWith("/"));
  for (const f of mediaFiles) fs.writeFileSync(path.join(mediaDir, path.basename(f)), zip.read(f));

  let sharp = null;
  try { sharp = requireDep("sharp"); } catch {}

  const doc = readText("word/document.xml");
  if (!doc) throw new Error("word/document.xml not found — is this a .docx file?");
  const body = doc.slice(doc.indexOf("<w:body"));
  const lines = [];
  const images = [];
  let lastHeading = "";
  let pendingCaptionFor = null;

  const blockRe = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = blockRe.exec(body))) {
    const block = m[0];
    if (block.startsWith("<w:tbl")) {
      const rows = [...block.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((r) =>
        [...r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) =>
          [...c[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((pp) => paraText(pp[0]).trim()).filter(Boolean).join(" / ")
            .replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim())
      );
      if (rows.length) {
        lines.push("");
        rows.forEach((r, i) => {
          lines.push("| " + r.join(" | ") + " |");
          if (i === 0) lines.push("|" + r.map(() => " --- |").join(""));
        });
        lines.push("");
      }
      pendingCaptionFor = null;
      continue;
    }
    const style = (block.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/) || [])[1];
    const isList = /<w:numPr>/.test(block);
    const text = paraText(block).trim();
    const embeds = [...block.matchAll(/\br:(?:embed|id)="([^"]+)"/g)].map((x) => rels[x[1]]).filter((t) => t && /media\//.test(t));

    for (const target of embeds) {
      const name = path.basename(target);
      const info = { file: "media/" + name, heading: lastHeading, caption: "" };
      if (sharp && /\.(png|jpe?g|gif|webp|tiff?|bmp)$/i.test(name)) {
        try {
          const meta = await sharp(path.join(mediaDir, name)).metadata();
          info.width = meta.width;
          info.height = meta.height;
        } catch {}
      }
      images.push(info);
      lines.push(`![${path.parse(name).name}](media/${name})`);
      pendingCaptionFor = info;
    }

    if (!text) continue;
    const isCaption = /^(hình|hinh|figure|fig\.|bảng|bang|table|biểu đồ|sơ đồ)\s*[\d.:–-]/i.test(text) || /caption/i.test(style || "");
    if (isCaption) {
      if (pendingCaptionFor && !pendingCaptionFor.caption) pendingCaptionFor.caption = text;
      else if (images.length && !images[images.length - 1].caption && /^(hình|hinh|figure|fig\.)/i.test(text)) images[images.length - 1].caption = text;
      lines.push(`*${text}*`);
      pendingCaptionFor = null;
      continue;
    }
    const level = headingLevel(style);
    if (level) {
      lastHeading = text;
      lines.push("", "#".repeat(Math.min(level, 6)) + " " + text, "");
    } else if (isList) {
      lines.push("- " + text);
    } else {
      lines.push(text, "");
    }
  }

  const md = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  fs.writeFileSync(path.join(outDir, "content.md"), md, "utf8");
  fs.writeFileSync(path.join(outDir, "images.json"), JSON.stringify(images, null, 2), "utf8");
  console.log(`Extracted ${md.split("\n").length} lines of text and ${mediaFiles.length} media files to ${outDir}`);
  console.log(`  ${path.join(outDir, "content.md")}`);
  console.log(`  ${path.join(outDir, "images.json")}`);
  const vector = mediaFiles.filter((f) => /\.(emf|wmf)$/i.test(f));
  if (vector.length) console.log(`  Note: ${vector.length} EMF/WMF file(s) — convert with: soffice --headless --convert-to png <file>`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
