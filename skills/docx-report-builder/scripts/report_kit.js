// report_kit.js — build Word (.docx) reports in code with the `docx` npm package.
//
//   const kit = require("<SKILL_DIR>/scripts/report_kit.js");
//   const r = kit.createReport({ preset: "vn-academic", lang: "vi", title: "...", author: "..." });
//   r.cover({ ... });  r.toc();
//   r.chapter("Tổng quan");           // "CHƯƠNG 1. TỔNG QUAN", new page, resets figure/table numbers
//   r.h2("Bối cảnh");                 // "1.1. Bối cảnh"
//   r.p("Text with **bold**, *italic* and `code`.");
//   await r.figure("chart.png", { caption: "Kiến trúc hệ thống" });   // "Hình 1.1: Kiến trúc hệ thống"
//   r.table({ header: [...], rows: [[...]], caption: "..." });           // "Bảng 1.1: ..."
//   await r.markdown(fs.readFileSync("content.md", "utf8"), { baseDir });  // or write the body in Markdown
//   r.references(["Tác giả, Tên, Năm."]);
//   await r.save("report.docx");
const fs = require("fs");
const path = require("path");
const { requireDep } = require("./_deps");

const cm = (v) => Math.round((v / 2.54) * 1440); // centimetres -> twips (DXA)

const PRESETS = {
  // Common Vietnamese university / thesis format. Check the school's own template first.
  "vn-academic": {
    page: { width: 11906, height: 16838, margin: { top: cm(2), bottom: cm(2), left: cm(3), right: cm(2) } },
    font: "Times New Roman", size: 13, line: 1.5, after: 6, firstLine: 1.0, justify: true,
    h1: { size: 14, bold: true, caps: true, center: true, pageBreak: true, before: 0, after: 18 },
    h2: { size: 13, bold: true, before: 12, after: 6 },
    h3: { size: 13, bold: true, italic: true, before: 6, after: 6 },
    caption: { size: 12, italic: true },
    table: { size: 12, headFill: "D9D9D9", headColor: "000000", zebra: null, border: "000000" },
    accent: "000000",
    numberHeadings: true,
    pageNumber: "center",
  },
  // Clean business / technical report.
  modern: {
    page: { width: 11906, height: 16838, margin: { top: cm(2.54), bottom: cm(2.54), left: cm(2.54), right: cm(2.54) } },
    font: "Calibri", headFont: "Cambria", size: 11, line: 1.15, after: 8, firstLine: 0, justify: false,
    h1: { size: 20, bold: true, caps: false, center: false, pageBreak: true, before: 0, after: 12, accent: true },
    h2: { size: 14, bold: true, before: 14, after: 6, accent: true },
    h3: { size: 12, bold: true, before: 10, after: 4 },
    caption: { size: 10, italic: true, muted: true },
    table: { size: 10, headFill: "1F3A5F", headColor: "FFFFFF", zebra: "F2F4F7", border: "D0D5DD" },
    accent: "1F3A5F",
    numberHeadings: false,
    pageNumber: "right",
  },
};

const LABELS = {
  vi: { chapter: "CHƯƠNG", figure: "Hình", table: "Bảng", toc: "MỤC LỤC", refs: "TÀI LIỆU THAM KHẢO", tocHint: "Nhấn chuột phải → Update Field (hoặc F9) để cập nhật mục lục." },
  en: { chapter: "Chapter", figure: "Figure", table: "Table", toc: "Contents", refs: "References", tocHint: "Right-click → Update Field (or F9) to refresh the table of contents." },
};

function createReport(options = {}) {
  const D = requireDep("docx");
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
    ShadingType, BorderStyle, ImageRun, Footer, Header, PageNumber, TableOfContents, LevelFormat, PageBreak,
  } = D;

  const base = PRESETS[options.preset || "vn-academic"];
  if (!base) throw new Error(`Unknown preset "${options.preset}". Use: ${Object.keys(PRESETS).join(", ")}`);
  const P = JSON.parse(JSON.stringify(base));
  if (options.font) P.font = options.font;
  if (options.size) P.size = options.size;
  if (options.accent) P.accent = String(options.accent).replace(/^#/, "");
  if (options.numberHeadings !== undefined) P.numberHeadings = options.numberHeadings;
  const L = { ...LABELS[options.lang || "vi"], ...(options.labels || {}) };
  const headFont = P.headFont || P.font;
  const textWidth = P.page.width - P.page.margin.left - P.page.margin.right; // twips
  const pt = (v) => Math.round(v * 2); // points -> half-points
  const sp = (v) => Math.round(v * 20); // points -> twips

  const cover = [];
  const body = [];
  let chapterNo = 0, h2No = 0, h3No = 0, figNo = 0, tabNo = 0, listInstance = 0;
  const target = () => body;

  // ---------- inline Markdown: **bold**, *italic*, `code` ----------
  function runs(t, extra = {}) {
    if (Array.isArray(t)) return t.map((r) => (r instanceof TextRun ? r : new TextRun({ ...extra, ...r })));
    const out = [];
    const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
    let last = 0, m;
    const s = String(t);
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(new TextRun({ text: s.slice(last, m.index), ...extra }));
      const tok = m[0];
      if (tok.startsWith("**")) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...extra }));
      else if (tok.startsWith("`")) out.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas", ...extra }));
      else out.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...extra }));
      last = m.index + tok.length;
    }
    if (last < s.length) out.push(new TextRun({ text: s.slice(last), ...extra }));
    return out;
  }

  // ---------- styles ----------
  const headingStyle = (h) => ({
    run: { font: headFont, size: pt(h.size), bold: !!h.bold, italics: !!h.italic, allCaps: !!h.caps, color: h.accent ? P.accent : "000000" },
    paragraph: {
      spacing: { before: sp(h.before || 0), after: sp(h.after || 0), line: 240 * (h.line || 1.15) },
      alignment: h.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      keepNext: true, keepLines: true,
    },
  });
  const styles = {
    default: {
      document: { run: { font: P.font, size: pt(P.size) }, paragraph: { spacing: { line: Math.round(240 * P.line), after: sp(P.after) } } },
      heading1: headingStyle(P.h1),
      heading2: headingStyle(P.h2),
      heading3: headingStyle(P.h3),
    },
    paragraphStyles: [
      {
        id: "BodyText", name: "Body Text", basedOn: "Normal", quickFormat: true,
        paragraph: { alignment: P.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT, indent: P.firstLine ? { firstLine: cm(P.firstLine) } : undefined },
      },
      {
        id: "Caption", name: "Caption", basedOn: "Normal", quickFormat: true,
        run: { size: pt(P.caption.size), italics: !!P.caption.italic, color: P.caption.muted ? "555555" : "000000" },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: sp(4), after: sp(10), line: 240 } },
      },
      { id: "TableText", name: "Table Text", basedOn: "Normal", run: { size: pt(P.table.size) }, paragraph: { spacing: { before: 0, after: 0, line: 250 } } },
      {
        id: "Quote", name: "Quote", basedOn: "Normal", run: { italics: true, color: "444444" },
        paragraph: { indent: { left: cm(1), right: cm(1) }, spacing: { before: sp(4), after: sp(10) } },
      },
      { id: "Reference", name: "Reference", basedOn: "Normal", paragraph: { indent: { left: cm(1), hanging: cm(1) }, alignment: P.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT } },
      { id: "CoverText", name: "Cover Text", basedOn: "Normal", paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 276 } } },
    ],
  };
  const numbering = {
    config: [
      {
        reference: "bullets",
        levels: [0, 1, 2].map((lvl) => ({
          level: lvl, format: LevelFormat.BULLET, text: ["•", "–", "◦"][lvl], alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: cm(1 + lvl * 0.75), hanging: cm(0.5) } } },
        })),
      },
      {
        reference: "numbers",
        levels: [0, 1, 2].map((lvl) => ({
          level: lvl, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][lvl], text: `%${lvl + 1}.`, alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: cm(1 + lvl * 0.75), hanging: cm(0.6) } } },
        })),
      },
    ],
  };

  // ---------- cover ----------
  // cover({ top: ["TRƯỜNG ...", "KHOA ..."], logo: "logo.png", kind: "BÁO CÁO ĐỒ ÁN", title: "...",
  //         subtitle: "...", info: [["GVHD", "ThS. A"], ["Sinh viên", "B – 123"]], bottom: "TP. HCM, 11/2026" })
  let coverOpts = null;
  async function coverBuild(o) {
    const centered = (text, size, more = {}) => new Paragraph({ style: "CoverText", ...more.para, children: runs(text, { size: pt(size), bold: !!more.bold, allCaps: !!more.caps, color: more.color }) });
    for (const [i, line] of (o.top || []).entries()) cover.push(centered(line, 13, { bold: true, para: i === (o.top.length - 1) ? { spacing: { after: sp(6) } } : {} }));
    if (o.top && o.top.length) cover.push(centered("―――――――――――", 12, { para: { spacing: { after: sp(24) } } }));
    if (o.logo) {
      const img = await imageRun(o.logo, cm(o.logoWidthCm || 3.5));
      cover.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: sp(24) }, children: [img.run] }));
    } else {
      cover.push(new Paragraph({ spacing: { before: sp(72) }, children: [] }));
    }
    if (o.kind) cover.push(centered(o.kind, 15, { bold: true, para: { spacing: { after: sp(12) } } }));
    if (o.title) cover.push(centered(o.title, o.titleSize || 20, { bold: true, caps: o.titleCaps !== false, color: P.accent, para: { spacing: { after: sp(12), line: 300 } } }));
    if (o.subtitle) cover.push(centered(o.subtitle, 14, { para: { spacing: { after: sp(36) } } }));
    else cover.push(new Paragraph({ spacing: { after: sp(36) }, children: [] }));
    if (o.info && o.info.length) {
      const labelW = Math.round(textWidth * 0.36), valueW = Math.round(textWidth * 0.5), padW = textWidth - labelW - valueW;
      const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
      cover.push(new Table({
        width: { size: textWidth, type: WidthType.DXA },
        columnWidths: [padW, labelW, valueW],
        borders: noBorders,
        rows: o.info.map(([k, v]) => new TableRow({
          children: [
            new TableCell({ width: { size: padW, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ children: [] })] }),
            new TableCell({ width: { size: labelW, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ spacing: { after: sp(4) }, children: runs(k + ":", { bold: true, size: pt(13) }) })] }),
            new TableCell({ width: { size: valueW, type: WidthType.DXA }, borders: noBorders, children: String(v).split("\n").map((line) => new Paragraph({ spacing: { after: sp(4) }, children: runs(line, { size: pt(13) }) })) }),
          ],
        })),
      }));
    }
    if (o.bottom) cover.push(centered(o.bottom, 13, { bold: true, para: { spacing: { before: sp(o.bottomSpace || 120) } } }));
  }
  function coverFn(o) { coverOpts = o; }

  // ---------- body blocks ----------
  function p(t, o = {}) {
    target().push(new Paragraph({ style: o.style || "BodyText", alignment: o.align ? AlignmentType[o.align.toUpperCase()] : undefined, children: runs(t, o.run || {}) }));
  }
  function heading(text, level = 1, o = {}) {
    const lvl = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level];
    const h = P["h" + level];
    target().push(new Paragraph({ heading: lvl, pageBreakBefore: level === 1 && h.pageBreak && o.pageBreak !== false, children: runs(text) }));
  }
  // Unnumbered top-level heading ("MỞ ĐẦU", "KẾT LUẬN", "Introduction").
  const h1 = (text, o) => heading(text, 1, o);
  function chapter(title, o = {}) {
    chapterNo++; h2No = 0; h3No = 0; figNo = 0; tabNo = 0;
    const label = P.numberHeadings ? `${L.chapter} ${chapterNo}. ${title}` : title;
    heading(label, 1, o);
  }
  function h2(text) {
    h2No++; h3No = 0;
    heading(P.numberHeadings && chapterNo ? `${chapterNo}.${h2No}. ${text}` : text, 2);
  }
  function h3(text) {
    h3No++;
    heading(P.numberHeadings && chapterNo ? `${chapterNo}.${h2No}.${h3No}. ${text}` : text, 3);
  }
  function list(items, ordered, level = 0) {
    if (ordered && level === 0) listInstance++;
    for (const it of items) {
      if (Array.isArray(it)) { list(it, ordered, Math.min(level + 1, 2)); continue; }
      target().push(new Paragraph({
        numbering: ordered ? { reference: "numbers", level, instance: listInstance } : { reference: "bullets", level },
        alignment: P.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { after: sp(2) },
        children: runs(it),
      }));
    }
  }
  const bullets = (items) => list(items, false);
  const numbered = (items) => list(items, true);
  const quote = (t) => target().push(new Paragraph({ style: "Quote", children: runs(t) }));
  const pageBreak = () => target().push(new Paragraph({ children: [new PageBreak()] }));

  const label = (kind, n) => `${kind} ${chapterNo ? chapterNo + "." : ""}${n}`;
  function captionPara(text, kind, n, o = {}) {
    return new Paragraph({ style: "Caption", keepNext: !!o.keepNext, children: [new TextRun({ text: `${label(kind, n)}: `, bold: true }), ...runs(text)] });
  }

  // table({ header: ["A","B"], rows: [["1","2"]], widths: [0.3, 0.7], caption: "...", align: ["left","right"] })
  function table(o) {
    const cols = o.header ? o.header.length : o.rows[0].length;
    const fr = o.widths || Array(cols).fill(1 / cols);
    const sum = fr.reduce((a, b) => a + b, 0);
    const widths = fr.map((f) => Math.floor((f / sum) * textWidth));
    const border = { style: BorderStyle.SINGLE, size: 4, color: P.table.border };
    const borders = { top: border, bottom: border, left: border, right: border };
    const alignOf = (i) => AlignmentType[(o.align && o.align[i] ? o.align[i] : "left").toUpperCase()];
    const cell = (text, i, head, rowIdx) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders,
      shading: head ? { fill: P.table.headFill, type: ShadingType.CLEAR, color: "auto" }
        : P.table.zebra && rowIdx % 2 === 1 ? { fill: P.table.zebra, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      verticalAlign: "center",
      children: String(text ?? "").split("\n").map((line) => new Paragraph({
        style: "TableText", alignment: head ? AlignmentType.CENTER : alignOf(i),
        children: runs(line, head ? { bold: true, color: P.table.headColor } : {}),
      })),
    });
    if (o.caption) { tabNo++; target().push(captionPara(o.caption, L.table, tabNo, { keepNext: true })); }
    const rows = [];
    if (o.header) rows.push(new TableRow({ tableHeader: true, cantSplit: true, children: o.header.map((h, i) => cell(h, i, true, 0)) }));
    o.rows.forEach((r, ri) => rows.push(new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, ri)) })));
    target().push(new Table({ width: { size: textWidth, type: WidthType.DXA }, columnWidths: widths, rows }));
    target().push(new Paragraph({ spacing: { after: sp(6) }, children: [] }));
  }

  // image -> ImageRun sized to widthTwips (keeps aspect ratio). Converts SVG/WebP/etc. to PNG.
  async function imageRun(file, widthTwips, maxHeightTwips) {
    const sharp = requireDep("sharp");
    const src = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
    let meta = await sharp(src).metadata();
    let data = src, type = meta.format;
    if (!["png", "jpeg", "jpg", "gif", "bmp"].includes(type)) {
      data = await sharp(src, { density: 200 }).png().toBuffer();
      meta = await sharp(data).metadata();
      type = "png";
    }
    if (type === "jpeg") type = "jpg";
    let wPx = (widthTwips / 1440) * 96;
    let hPx = wPx * (meta.height / meta.width);
    const maxH = ((maxHeightTwips || (P.page.height - P.page.margin.top - P.page.margin.bottom) * 0.75) / 1440) * 96;
    if (hPx > maxH) { wPx *= maxH / hPx; hPx = maxH; }
    return { run: new ImageRun({ type, data, transformation: { width: Math.round(wPx), height: Math.round(hPx) } }) };
  }

  // figure(path|Buffer, { caption, width: 0.8 /* fraction of text width */ })
  async function figure(file, o = {}) {
    const img = await imageRun(file, textWidth * (o.width || 0.8));
    target().push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: sp(6), after: sp(2) }, children: [img.run] }));
    if (o.caption) { figNo++; target().push(captionPara(o.caption, L.figure, figNo)); }
  }

  function toc(o = {}) {
    target().push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: sp(12) }, children: [new TextRun({ text: o.title || L.toc, bold: true, size: pt(P.h1.size), font: headFont })] }));
    target().push(new TableOfContents(o.title || L.toc, { hyperlink: true, headingStyleRange: o.levels || "1-3" }));
    target().push(new Paragraph({ children: [new PageBreak()] }));
    usedToc = true;
  }
  let usedToc = false;

  function references(items, o = {}) {
    heading(o.title || L.refs, 1);
    items.forEach((it, i) => target().push(new Paragraph({ style: "Reference", children: [new TextRun(`[${i + 1}]\t`), ...runs(it)] })));
  }

  // ---------- Markdown body ----------
  // Supports: # chapter (add {-} for an unnumbered heading), ##, ###, paragraphs, - / * bullets,
  // 1. numbered lists (indent 2+ spaces to nest), > quote, ![caption](image.png){width=0.6},
  // pipe tables (a line "Bảng: caption" / "Table: caption" right above sets the caption),
  // "---" or "\pagebreak" for a page break, and inline **bold**, *italic*, `code`.
  async function markdown(md, o = {}) {
    const baseDir = o.baseDir || process.cwd();
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    let para = [];
    let tableCaption = null;
    const flush = () => { if (para.length) { p(para.join(" ")); para = []; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      if (!t) { flush(); continue; }
      let m;
      if ((m = t.match(/^(#{1,3})\s+(.*?)\s*(\{-\})?$/))) {
        flush();
        const level = m[1].length, text = m[2];
        if (level === 1) (m[3] ? h1(text) : chapter(text));
        else if (level === 2) (m[3] ? heading(text, 2) : h2(text));
        else (m[3] ? heading(text, 3) : h3(text));
        continue;
      }
      if (t === "---" || t === "\\pagebreak") { flush(); pageBreak(); continue; }
      if ((m = t.match(/^!\[(.*?)\]\((.+?)\)(\{width=([\d.]+)\})?$/))) {
        flush();
        await figure(path.resolve(baseDir, m[2]), { caption: m[1] || undefined, width: m[4] ? Number(m[4]) : undefined });
        continue;
      }
      if ((m = t.match(/^(?:Bảng|Table)\s*:\s*(.+)$/i)) && lines[i + 1] && lines[i + 1].trim().startsWith("|")) {
        flush(); tableCaption = m[1]; continue;
      }
      if (t.startsWith("|")) {
        flush();
        const rowsRaw = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) { rowsRaw.push(lines[i].trim()); i++; }
        i--;
        const split = (r) => r.replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
        const rows = rowsRaw.map(split);
        const sepIdx = rows.findIndex((r) => r.every((c) => /^:?-{2,}:?$/.test(c)));
        const align = sepIdx === 1 ? rows[1].map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left")) : undefined;
        const header = sepIdx === 1 ? rows[0] : undefined;
        const bodyRows = rows.filter((_, k) => k !== sepIdx && !(header && k === 0));
        table({ header, rows: bodyRows, align, caption: tableCaption || undefined });
        tableCaption = null;
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        flush();
        const ordered = /^\s*\d+[.)]/.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          const indent = lines[i].match(/^\s*/)[0].length;
          const text = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "");
          if (indent >= 2 && items.length) {
            const last = items[items.length - 1];
            if (Array.isArray(last)) last.push(text); else items.push([text]);
          } else items.push(text);
          i++;
        }
        i--;
        list(items, ordered);
        continue;
      }
      if (t.startsWith(">")) { flush(); quote(t.replace(/^>\s?/, "")); continue; }
      para.push(t);
    }
    flush();
  }

  // ---------- save ----------
  async function save(out) {
    if (coverOpts) await coverBuild(coverOpts);
    const pageProps = { size: { width: P.page.width, height: P.page.height }, margin: P.page.margin };
    const align = P.pageNumber === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER;
    const footer = new Footer({ children: [new Paragraph({ alignment: align, children: [new TextRun({ children: [PageNumber.CURRENT], size: pt(P.size - 1) })] })] });
    const header = options.header
      ? new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: options.header, size: pt(P.size - 2), color: "666666", italics: true })] })] })
      : undefined;
    const sections = [];
    if (cover.length) sections.push({ properties: { page: pageProps }, children: cover });
    sections.push({
      properties: { page: { ...pageProps, pageNumbers: { start: 1 } } },
      headers: header ? { default: header } : undefined,
      footers: { default: footer },
      children: body.length ? body : [new Paragraph({ children: [] })],
    });
    const doc = new Document({
      creator: options.author || "",
      title: options.title || "",
      description: options.description || "",
      styles,
      numbering,
      features: usedToc ? { updateFields: true } : undefined,
      sections,
    });
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, await Packer.toBuffer(doc));
    console.log(`Wrote ${out} (${chapterNo} numbered chapter(s), preset "${options.preset || "vn-academic"}")`);
    if (usedToc) console.log("Note: TOC page numbers are filled in by Word when the file opens (it asks to update fields); LibreOffice previews show entries without numbers. " + L.tocHint);
  }

  return { cover: coverFn, toc, chapter, h1, h2, h3, heading, p, bullets, numbered, quote, pageBreak, table, figure, references, markdown, save, preset: P, textWidth };
}

module.exports = { createReport, PRESETS, requireDep };
