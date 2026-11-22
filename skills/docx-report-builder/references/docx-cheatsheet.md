# docx (npm, v9) cheat sheet

`report_kit` covers the usual report. Use the library directly for anything else; load it the same way the kit does:
`const D = kit.requireDep("docx");`

## Units
- Font size: half-points (`size: 26` = 13 pt).
- Spacing, indents, margins, table widths: twips / DXA (1 in = 1440, 1 cm ≈ 567, 1 pt = 20).
- Line spacing: `spacing: { line: 360 }` = 1.5 lines (240 = single).
- Image size: pixels at 96 dpi (`transformation: { width: 600, height: 300 }`).

## Document skeleton
```js
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = D;
const doc = new Document({
  styles: { default: { document: { run: { font: "Times New Roman", size: 26 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
               children: [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Title")] })] }],
});
fs.writeFileSync("out.docx", await Packer.toBuffer(doc));
```

## Text
```js
new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 567 }, spacing: { before: 0, after: 120, line: 360 },
  keepNext: true, pageBreakBefore: false,
  children: [ new TextRun({ text: "bold", bold: true }), new TextRun({ text: " italic", italics: true, color: "C00000" }),
              new TextRun({ text: "x", superScript: true }), new TextRun({ break: 1 }) ] });
```

## Hyperlinks and footnotes
```js
new Paragraph({ children: [ new D.ExternalHyperlink({ link: "https://example.com", children: [new TextRun({ text: "link", style: "Hyperlink" })] }) ] });
// footnotes: declare in Document, reference in text
new Document({ footnotes: { 1: { children: [new Paragraph("Footnote text")] } }, sections: [...] });
new Paragraph({ children: [new TextRun("Claim"), new D.FootnoteReferenceRun(1)] });
```

## Landscape section (wide table or diagram)
```js
sections.push({ properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE, width: 11906, height: 16838 } } }, children: [...] });
```
(width/height are given in portrait order; the library swaps them for landscape.)

## Columns
```js
{ properties: { column: { count: 2, space: 708, separate: true } }, children: [...] }
```

## Headers / footers / page numbers
```js
footers: { default: new D.Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER,
  children: [ new TextRun({ children: ["Trang ", D.PageNumber.CURRENT, " / ", D.PageNumber.TOTAL_PAGES] }) ] }) ] }) },
properties: { titlePage: true }   // different first page; then headers.first / footers.first
```

## Tables
```js
new D.Table({ width: { size: 9071, type: D.WidthType.DXA }, columnWidths: [3000, 6071],
  rows: [ new D.TableRow({ tableHeader: true, children: [
    new D.TableCell({ width: { size: 3000, type: D.WidthType.DXA }, columnSpan: 1, rowSpan: 1,
      shading: { fill: "D9D9D9", type: D.ShadingType.CLEAR, color: "auto" },
      verticalAlign: D.VerticalAlign.CENTER, children: [new Paragraph("Header")] }), ... ] }) ] });
```
Always give both `columnWidths` and each cell's `width` in DXA; percentage widths render inconsistently.

## Images
```js
new D.ImageRun({ type: "png", data: fs.readFileSync("fig.png"), transformation: { width: 500, height: 280 }, altText: { title: "Fig", description: "...", name: "fig" } })
```
`type` is required in v9 (`png`, `jpg`, `gif`, `bmp`, `svg` with a `fallback` PNG).

## Table of contents
```js
new D.TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" });
new Document({ features: { updateFields: true }, ... });   // Word asks to refresh fields on open
```
Headings must use `HeadingLevel.*` to appear.

## Page break, section break
`new Paragraph({ children: [new D.PageBreak()] })` or `pageBreakBefore: true` on the next paragraph. A new entry in `sections` starts a new page with its own settings.

## Pitfalls
- `\n` inside a `TextRun` does not create a line break; use `new TextRun({ break: 1 })` or separate paragraphs.
- Do not put unicode bullets in text; use `numbering` configs (the kit defines `bullets` and `numbers`).
- Do not use `WidthType.PERCENTAGE` for tables meant to open in Google Docs/LibreOffice.
- Heading style overrides go in `styles.default.heading1..6`, not `paragraphStyles`, so the TOC still recognises them.
