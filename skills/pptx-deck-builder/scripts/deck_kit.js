// deck_kit.js — a small layer over pptxgenjs for building themed 16:9 decks in code.
//
//   const kit = require("<SKILL_DIR>/scripts/deck_kit.js");
//   const deck = kit.createDeck({ theme: "plum-coral", title: "...", author: "...", footer: "..." });
//   const s = deck.slide("CONTENT", { section: "Intro", kicker: "01 · INTRO", title: "One clear claim", notes: "..." });
//   deck.text(s, "Body text", { x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 18 });
//   await deck.save("out.pptx");   // writes the file, applies the theme, prints layout warnings
//
// Slide size is 10 x 5.625 in. All positions are in inches.
// Colors: use deck.C.* (scheme colors, follow the theme) for shapes and text;
// use deck.HEX.* (plain hex) where pptxgenjs needs hex: charts and icon images.
const fs = require("fs");
const path = require("path");
const { requireDep } = require("./_deps");
const { applyTheme } = require("./apply_theme");

const W = 10;
const H = 5.625;

// Every preset uses the same roles, so the helpers below look right with any of them:
//   dk1 ink (dark text / dark backgrounds)  lt1 paper (white)
//   dk2 second dark                         lt2 card fill (very light)
//   accent1 primary   accent2 secondary   accent3 highlight (readable on dk1)
//   accent4 muted text (readable on lt1)  accent5 soft lines / muted text on dk1   accent6 deep primary
const THEMES = {
  "plum-coral": {
    name: "Plum Coral",
    fonts: { head: "Cambria", body: "Calibri" },
    colors: { dk1: "1B1726", lt1: "FFFFFF", dk2: "3A3450", lt2: "F3F1F6", accent1: "C8431F", accent2: "1B7F86", accent3: "E9A23B", accent4: "6B6680", accent5: "C9C4D6", accent6: "8E2C1A" },
  },
  "charcoal-red": {
    name: "Charcoal Red",
    fonts: { head: "Cambria", body: "Calibri" },
    colors: { dk1: "1D1D1F", lt1: "FFFFFF", dk2: "2A2C33", lt2: "F2F2F3", accent1: "B3122E", accent2: "1F7A5C", accent3: "D98E04", accent4: "5B6170", accent5: "A7ACB6", accent6: "7A0C1F" },
  },
  "navy-teal": {
    name: "Navy Teal",
    fonts: { head: "Georgia", body: "Calibri" },
    colors: { dk1: "14213D", lt1: "FFFFFF", dk2: "1F3A5F", lt2: "EEF2F7", accent1: "0F7C8C", accent2: "2F5DA8", accent3: "F2B544", accent4: "5A6478", accent5: "B8C2D3", accent6: "0A4F5A" },
  },
  "forest-amber": {
    name: "Forest Amber",
    fonts: { head: "Cambria", body: "Calibri" },
    colors: { dk1: "1A2B22", lt1: "FFFFFF", dk2: "2C4A3A", lt2: "F1F4EF", accent1: "2E7D4F", accent2: "B5652A", accent3: "E8B23A", accent4: "5E6B63", accent5: "BFCBC2", accent6: "1D5435" },
  },
};

function resolveTheme(theme) {
  if (!theme) return THEMES["plum-coral"];
  if (typeof theme === "string") {
    if (!THEMES[theme]) throw new Error(`Unknown theme "${theme}". Presets: ${Object.keys(THEMES).join(", ")}`);
    return THEMES[theme];
  }
  const fonts = theme.fonts || { head: theme.headFontFace || "Cambria", body: theme.bodyFontFace || "Calibri" };
  const colors = {};
  for (const [k, v] of Object.entries(theme.colors || {})) colors[k] = String(v).replace(/^#/, "").toUpperCase();
  return { name: theme.name || "Custom", fonts, colors };
}

// ---------- rough text-fit estimate (used for warnings only) ----------
const CHAR_W = 0.5; // average glyph width as a fraction of font size (Calibri-like fonts)
function paragraphsOf(t) {
  if (typeof t === "string") return t.split("\n").map((s) => ({ text: s, size: null, bold: false, bullet: false }));
  const paras = [];
  let cur = { text: "", size: null, bold: false, bullet: false };
  for (const run of t || []) {
    const o = run.options || {};
    cur.text += run.text || "";
    if (o.fontSize) cur.size = Math.max(cur.size || 0, o.fontSize);
    if (o.bold) cur.bold = true;
    if (o.bullet) cur.bullet = true;
    if (o.breakLine) {
      paras.push(cur);
      cur = { text: "", size: null, bold: false, bullet: false };
    }
  }
  if (cur.text || !paras.length) paras.push(cur);
  return paras;
}
function estimateHeight(t, opts) {
  const base = opts.fontSize || 14;
  const widthPt = (opts.w || 1) * 72;
  const spacing = opts.lineSpacingMultiple || 1.2;
  let total = 0;
  const paras = paragraphsOf(t);
  paras.forEach((p, i) => {
    const fs = p.size || base;
    const usable = widthPt - (p.bullet || opts.bullet ? 18 : 0);
    const charW = fs * (CHAR_W + (p.bold || opts.bold ? 0.04 : 0));
    const lines = Math.max(1, Math.ceil((p.text.length * charW) / Math.max(usable, 1)));
    total += lines * fs * spacing;
    if (i < paras.length - 1) total += opts.paraSpaceAfter || 0;
  });
  return total / 72;
}

function createDeck(options = {}) {
  const pptxgen = requireDep("pptxgenjs");
  const theme = resolveTheme(options.theme);
  const HEX = { ...theme.colors };

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.theme = { headFontFace: theme.fonts.head, bodyFontFace: theme.fonts.body };
  if (options.title) pres.title = options.title;
  if (options.author) pres.author = options.author;
  if (options.company) pres.company = options.company;
  const C = pres.SchemeColor; // text1=dk1, text2=dk2, background1=lt1, background2=lt2, accent1..6
  const S = pres.shapes;
  const warnings = [];
  let slideCount = 0;
  let currentSection = null;
  const sections = new Set();

  // ---------- masters ----------
  const footer = options.footer;
  const titleBox = {};
  const ph = (name, type, o) => ({ placeholder: { options: { name, type, margin: 0, ...o }, text: "" } });

  titleBox.COVER = { x: 0.6, y: 1.85, w: 8.8, h: 1.35, fontSize: 32 };
  pres.defineSlideMaster({
    title: "COVER",
    background: { color: C.text1 },
    objects: [
      ph("kicker", "body", { x: 0.6, y: 1.5, w: 8.8, h: 0.3, fontSize: 12, bold: true, color: C.accent3, charSpacing: 2 }),
      ph("title", "title", { ...titleBox.COVER, bold: true, color: C.background1, valign: "top", align: "left", fontFace: theme.fonts.head }),
    ],
  });

  titleBox.CONTENT = { x: 0.5, y: 0.6, w: 9.0, h: 0.65, fontSize: 28 };
  const contentObjects = [
    ph("kicker", "body", { x: 0.5, y: 0.3, w: 9.0, h: 0.28, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2 }),
    ph("title", "title", { ...titleBox.CONTENT, bold: true, color: C.text1, valign: "middle", align: "left", fontFace: theme.fonts.head }),
  ];
  if (footer) contentObjects.push({ text: { text: footer, options: { x: 0.5, y: 5.24, w: 7.5, h: 0.24, fontSize: 10, color: C.accent4, margin: 0 } } });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.background1 },
    objects: contentObjects,
    slideNumber: { x: 9.0, y: 5.24, w: 0.5, h: 0.24, fontSize: 10, color: C.accent4, align: "right", margin: 0 },
  });

  titleBox.DARK = { x: 0.5, y: 0.6, w: 9.0, h: 0.65, fontSize: 28 };
  pres.defineSlideMaster({
    title: "DARK",
    background: { color: C.text1 },
    objects: [
      ph("kicker", "body", { x: 0.5, y: 0.3, w: 9.0, h: 0.28, fontSize: 12, bold: true, color: C.accent3, charSpacing: 2 }),
      ph("title", "title", { ...titleBox.DARK, bold: true, color: C.background1, valign: "middle", align: "left", fontFace: theme.fonts.head }),
    ],
    slideNumber: { x: 9.0, y: 5.24, w: 0.5, h: 0.24, fontSize: 10, color: C.accent5, align: "right", margin: 0 },
  });

  // ---------- layout checks ----------
  const where = (name) => `slide ${slideCount}${name ? ` (${name})` : ""}`;
  function checkBounds(o, name) {
    const eps = 0.01;
    if (o.x < -eps || o.y < -eps || o.x + o.w > W + eps || o.y + o.h > H + eps) {
      warnings.push(`${where(name)}: box x=${o.x} y=${o.y} w=${o.w} h=${o.h} goes outside the ${W} x ${H} in slide`);
    }
  }
  function checkFit(t, o, name) {
    if (o.fit || o.autoFit) return;
    const need = estimateHeight(t, o);
    if (need > o.h * 1.08 + 0.04) {
      const sample = (typeof t === "string" ? t : (t || []).map((r) => r.text).join("")).slice(0, 50);
      warnings.push(`${where(name)}: text may overflow its box (needs ~${need.toFixed(2)} in, box h=${o.h}): "${sample}${sample.length >= 50 ? "…" : ""}"`);
    }
  }

  // ---------- slides ----------
  function slide(master = "CONTENT", o = {}) {
    if (!titleBox[master] && !o.allowCustomMaster) throw new Error(`Unknown master "${master}". Use COVER, CONTENT or DARK (or pass allowCustomMaster: true).`);
    const section = o.section || currentSection;
    if (section && !sections.has(section)) {
      pres.addSection({ title: section });
      sections.add(section);
    }
    currentSection = section;
    const s = pres.addSlide({ masterName: master, ...(section ? { sectionTitle: section } : {}) });
    slideCount++;
    if (o.kicker) s.addText(o.kicker, { placeholder: "kicker" });
    if (o.title) {
      s.addText(o.title, { placeholder: "title" });
      const tb = titleBox[master];
      if (tb) checkFit(o.title, { ...tb, bold: true }, "title");
    }
    if (o.notes) s.addNotes(o.notes);
    return s;
  }

  // ---------- drawing helpers ----------
  function text(s, t, o = {}) {
    const opts = { isTextBox: true, margin: 0, valign: "top", color: C.text1, fontSize: 14, ...o };
    checkBounds(opts, o.objectName);
    checkFit(t, opts, o.objectName);
    s.addText(t, opts);
  }

  // Bulleted list. items: array of strings or run arrays.
  function bullets(s, items, o = {}) {
    const runs = [];
    items.forEach((it, i) => {
      const last = i === items.length - 1;
      if (typeof it === "string") runs.push({ text: it, options: { bullet: { indent: 16 }, breakLine: !last } });
      else it.forEach((r, j) => runs.push({ text: r.text, options: { ...(r.options || {}), ...(j === 0 ? { bullet: { indent: 16 } } : {}), breakLine: j === it.length - 1 ? !last : !!(r.options && r.options.breakLine) } }));
    });
    text(s, runs, { paraSpaceAfter: 8, fontSize: 16, ...o });
  }

  function card(s, x, y, w, h, fill = C.background2, name = "card", o = {}) {
    checkBounds({ x, y, w, h }, name);
    s.addShape(S.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { type: "none" }, objectName: name, ...o });
  }

  function rect(s, x, y, w, h, fill, name = "rect", o = {}) {
    checkBounds({ x, y, w, h }, name);
    s.addShape(S.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName: name, ...o });
  }

  // Straight connector with an arrow head from (x1,y1) to (x2,y2).
  function arrow(s, x1, y1, x2, y2, name = "arrow", color = C.accent4) {
    s.addShape(S.LINE, {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
      flipH: x2 < x1, flipV: y2 < y1,
      line: { color, width: 1.5, endArrowType: "triangle" }, objectName: name,
    });
  }

  // Icon (react-icons component) rendered to a PNG data URI in the given hex color.
  async function icon(Comp, hexColor = "FFFFFF", px = 256) {
    const React = requireDep("react");
    const ReactDOMServer = requireDep("react-dom/server");
    const sharp = requireDep("sharp");
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + String(hexColor).replace(/^#/, ""), size: String(px) }));
    const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
    return "image/png;base64," + buf.toString("base64");
  }

  async function iconImage(s, Comp, x, y, size, hexColor = HEX.accent1, name = "icon") {
    checkBounds({ x, y, w: size, h: size }, name);
    s.addImage({ data: await icon(Comp, hexColor), x, y, w: size, h: size, objectName: name, altText: "" });
  }

  // Filled circle with a white icon centred in it — the recurring motif.
  async function iconCircle(s, Comp, x, y, d, fill = C.accent1, name = "icon") {
    checkBounds({ x, y, w: d, h: d }, name);
    s.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: name + " circle" });
    const pad = d * 0.25;
    s.addImage({ data: await icon(Comp, HEX.lt1), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, objectName: name, altText: "" });
  }

  function badge(s, label, x, y, d = 0.42, fill = C.accent1) {
    s.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: `badge ${label}` });
    text(s, String(label), { x, y, w: d, h: d, fontSize: Math.round(d * 32), bold: true, color: C.background1, align: "center", valign: "middle" });
  }

  // Rounded pill with a short code/label inside ("G1", "C4", "NEW").
  function chip(s, label, x, y, w = 0.62, h = 0.32, fill = C.accent1, fontSize = 13) {
    checkBounds({ x, y, w, h }, "chip " + label);
    s.addText(String(label), {
      shape: S.ROUNDED_RECTANGLE, rectRadius: h / 2, x, y, w, h, fill: { color: fill },
      color: C.background1, bold: true, fontSize, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "chip " + label,
    });
  }

  // Dark strip near the bottom carrying the slide's one take-away sentence.
  function noteBar(s, runs, y = 4.4, h = 0.65) {
    card(s, 0.5, y, 9.0, h, C.text1, "note bar");
    text(s, runs, { x: 0.75, y, w: 8.5, h, fontSize: 15, color: C.background1, valign: "middle" });
  }

  // Big number + label, e.g. stat(s, "0.997", "F1 score", "target ≥ 0.90", x, y, w, h)
  function stat(s, value, label, sub, x, y, w = 2.8, h = 1.0, fill = C.background2) {
    card(s, x, y, w, h, fill, "stat " + label);
    const vw = Math.min(w * 0.45, 1.9);
    text(s, value, { x: x + 0.22, y, w: vw, h, fontSize: 26, bold: true, color: C.accent1, valign: "middle", objectName: "stat value" });
    text(s, label, { x: x + 0.3 + vw, y: y + h * 0.2, w: w - vw - 0.45, h: h * 0.32, fontSize: 14, bold: true });
    if (sub) text(s, sub, { x: x + 0.3 + vw, y: y + h * 0.52, w: w - vw - 0.45, h: h * 0.32, fontSize: 12, color: C.accent4 });
  }

  // Place an image inside a box, keeping its aspect ratio. Returns the placed rect.
  async function fitImage(s, file, bx, by, bw, bh, altText, o = {}) {
    const sharp = requireDep("sharp");
    const src = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
    let img = sharp(src);
    if (o.crop) img = img.extract(o.crop); // { left, top, width, height } in px
    const m = await img.metadata();
    const buf = await img.png().toBuffer();
    const meta = o.crop ? { width: o.crop.width, height: o.crop.height } : m;
    const ar = meta.width / meta.height;
    let w = bw, h = bw / ar;
    if (h > bh) { h = bh; w = bh * ar; }
    const x = o.align === "left" ? bx : bx + (bw - w) / 2;
    const y = o.valign === "top" ? by : by + (bh - h) / 2;
    checkBounds({ x, y, w, h }, altText);
    s.addImage({ data: "image/png;base64," + buf.toString("base64"), x, y, w, h, altText: altText || "", objectName: altText || "image" });
    return { x, y, w, h };
  }

  // Table with a dark header row. rows: array of arrays of strings.
  function table(s, header, rows, o = {}) {
    const fontSize = o.fontSize || 13;
    const head = header.map((t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 }, fontSize } }));
    const body = rows.map((r, i) => r.map((t) => ({ text: String(t), options: { fontSize, color: C.text1, fill: { color: i % 2 ? C.background1 : C.background2 } } })));
    const opts = { x: 0.5, y: 1.5, w: 9.0, rowH: 0.45, border: { type: "solid", pt: 0.5, color: HEX.lt2 }, margin: [4, 8, 4, 8], valign: "middle", ...o };
    const rowsH = (rows.length + 1) * (Array.isArray(opts.rowH) ? Math.max(...opts.rowH) : opts.rowH);
    checkBounds({ x: opts.x, y: opts.y, w: opts.w, h: rowsH }, "table");
    delete opts.fontSize;
    s.addTable([head, ...body], opts);
  }

  // Chart options that match the theme. Usage:
  //   s.addChart(deck.pres.charts.BAR, data, { x, y, w, h, ...deck.chartStyle(), chartColors: [deck.HEX.accent1] })
  function chartStyle() {
    return {
      catAxisLabelFontFace: theme.fonts.body, valAxisLabelFontFace: theme.fonts.body, dataLabelFontFace: theme.fonts.body,
      legendFontFace: theme.fonts.body, titleFontFace: theme.fonts.body,
      catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent4, dataLabelColor: HEX.dk1, titleColor: HEX.dk1,
      catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, dataLabelFontSize: 12, legendFontSize: 12, titleFontSize: 14,
      valGridLine: { color: HEX.lt2, size: 1 }, catGridLine: { style: "none" },
      chartColors: [HEX.accent1, HEX.accent2, HEX.accent3, HEX.accent4, HEX.accent5, HEX.accent6],
    };
  }

  // Equal-width columns across the content area: cols(3) -> [{x,w},{x,w},{x,w}]
  function cols(n, gap = 0.25, left = 0.5, width = 9.0) {
    const w = (width - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => ({ x: +(left + i * (w + gap)).toFixed(3), w: +w.toFixed(3) }));
  }

  async function save(out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await pres.writeFile({ fileName: out });
    await applyTheme(out, theme);
    console.log(`Wrote ${out} (${slideCount} slides, theme "${theme.name}")`);
    if (warnings.length) {
      console.log(`\n${warnings.length} layout warning(s) — check these slides in the rendered images:`);
      for (const w of warnings) console.log("  - " + w);
    } else {
      console.log("No layout warnings.");
    }
    return { file: out, slides: slideCount, warnings };
  }

  return {
    pres, C, S, HEX, theme, W, H,
    slide, text, bullets, card, rect, arrow, icon, iconImage, iconCircle, badge, chip, noteBar, stat,
    fitImage, table, chartStyle, cols, save, warnings,
  };
}

module.exports = { createDeck, THEMES, W, H, requireDep };
