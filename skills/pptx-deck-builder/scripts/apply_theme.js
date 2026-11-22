#!/usr/bin/env node
// Write a theme (color scheme + heading/body fonts) into a .pptx file.
//
// pptxgenjs always writes the default Office theme into ppt/theme/theme1.xml, so
// any shape that uses a scheme color (pres.SchemeColor.accent1, ...) shows Office
// blue/orange until the theme is patched. deck_kit.save() calls this for you.
//
// CLI:  node apply_theme.js deck.pptx theme.json
// API:  await applyTheme("deck.pptx", theme)
//
// theme = {
//   name: "My Theme",
//   fonts: { head: "Cambria", body: "Calibri" },          // or headFontFace / bodyFontFace
//   colors: { dk1, lt1, dk2, lt2, accent1..accent6, hlink, folHlink }  // hex, "#" optional
// }
const fs = require("fs");
const { requireJSZip } = require("./_deps");

const SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hex = (v, slot) => {
  const h = String(v || "").replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(h)) throw new Error(`Theme color "${slot}" must be a 6-digit hex value, got "${v}"`);
  return h;
};

function buildClrScheme(theme) {
  const c = theme.colors || {};
  const missing = SLOTS.filter((s) => !c[s] && !(s === "hlink" || s === "folHlink"));
  if (missing.length) throw new Error("Theme is missing colors: " + missing.join(", "));
  const filled = { ...c, hlink: c.hlink || c.accent1, folHlink: c.folHlink || c.accent6 };
  const body = SLOTS.map((s) => `<a:${s}><a:srgbClr val="${hex(filled[s], s)}"/></a:${s}>`).join("");
  return `<a:clrScheme name="${xmlEscape(theme.name || "Custom")}">${body}</a:clrScheme>`;
}

function patchThemeXml(xml, theme) {
  const head = (theme.fonts && theme.fonts.head) || theme.headFontFace;
  const bodyFont = (theme.fonts && theme.fonts.body) || theme.bodyFontFace;
  let out = xml.replace(/<a:clrScheme\b[^>]*>[\s\S]*?<\/a:clrScheme>/, buildClrScheme(theme));
  if (head) {
    out = out.replace(/(<a:majorFont>\s*)<a:latin\b[^>]*\/>/, `$1<a:latin typeface="${xmlEscape(head)}"/>`);
  }
  if (bodyFont) {
    out = out.replace(/(<a:minorFont>\s*)<a:latin\b[^>]*\/>/, `$1<a:latin typeface="${xmlEscape(bodyFont)}"/>`);
  }
  if (theme.name) {
    out = out.replace(/(<a:theme\b[^>]*\bname=")[^"]*(")/, `$1${xmlEscape(theme.name)}$2`);
    out = out.replace(/(<a:fontScheme\b[^>]*\bname=")[^"]*(")/, `$1${xmlEscape(theme.name)}$2`);
  }
  return out;
}

async function applyTheme(file, theme) {
  const JSZip = requireJSZip();
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const themeFiles = Object.keys(zip.files).filter((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f));
  if (!themeFiles.length) throw new Error("No ppt/theme/themeN.xml found in " + file);
  for (const f of themeFiles) {
    const xml = await zip.file(f).async("string");
    zip.file(f, patchThemeXml(xml, theme));
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(file, buf);
}

module.exports = { applyTheme, patchThemeXml };

if (require.main === module) {
  const [file, themePath] = process.argv.slice(2);
  if (!file || !themePath) {
    console.error("Usage: node apply_theme.js deck.pptx theme.json");
    process.exit(1);
  }
  applyTheme(file, JSON.parse(fs.readFileSync(themePath, "utf8")))
    .then(() => console.log("Theme applied to", file))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
