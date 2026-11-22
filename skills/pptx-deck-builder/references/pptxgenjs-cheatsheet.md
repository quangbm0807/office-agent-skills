# pptxgenjs cheat sheet (v3.12 / v4)

Use `deck.pres` (the `pptxgen` instance) and the slide object `s` for anything `deck_kit` does not wrap.

## Presentation
```js
pres.layout = "LAYOUT_16x9";             // 10 x 5.625 in (LAYOUT_WIDE = 13.33 x 7.5)
pres.title = "..."; pres.author = "...";
pres.addSection({ title: "Part 1" });     // then pres.addSlide({ sectionTitle: "Part 1" })
pres.defineSlideMaster({ title, background: { color }, objects: [...], slideNumber: {...} });
await pres.writeFile({ fileName: "out.pptx" });
```

## Text
```js
s.addText("Plain", { x, y, w, h, fontSize: 14, fontFace: "Calibri", color: "1B1726", bold: true, italic: true,
  align: "left" | "center" | "right" | "justify", valign: "top" | "middle" | "bottom",
  margin: 0, isTextBox: true, paraSpaceAfter: 6, lineSpacingMultiple: 1.1, charSpacing: 2, rotate: 0 });
s.addText([
  { text: "Bold part ", options: { bold: true, color: "C8431F" } },
  { text: "normal part", options: { breakLine: true } },          // breakLine ends the paragraph
  { text: "Bullet", options: { bullet: true } },                    // or bullet: { type: "number" }, { indent: 16 }
  { text: "Link", options: { hyperlink: { url: "https://example.com" } } },
], { x, y, w, h });
s.addText("Into placeholder", { placeholder: "title" });            // placeholder names from the master
```
- Text inside a shape: `s.addText("Hi", { shape: pres.shapes.ROUNDED_RECTANGLE, fill: { color }, rectRadius: 0.1, ... })`.
- Superscript/subscript: `{ superscript: true }` / `{ subscript: true }` in run options.

## Shapes
```js
s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "F3F1F6", transparency: 0 }, line: { color: "CCCCCC", width: 1, dashType: "dash" } });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { ..., rectRadius: 0.08 });
s.addShape(pres.shapes.OVAL, { ... });
s.addShape(pres.shapes.LINE, { x, y, w, h, line: { color, width: 1.5, beginArrowType: "none", endArrowType: "triangle" }, flipH, flipV });
s.addShape(pres.shapes.RIGHT_ARROW, { ... }); // also CHEVRON, PENTAGON, TRIANGLE, DONUT, ARC ...
```
Shadow: `shadow: { type: "outer", blur: 6, offset: 2, angle: 90, color: "000000", opacity: 0.15 }` (new object each time).

## Images
```js
s.addImage({ path: "fig.png", x, y, w, h, altText: "..." });
s.addImage({ data: "image/png;base64,....", x, y, w, h });
s.addImage({ path, x, y, w, h, sizing: { type: "cover" | "contain" | "crop", w, h } });
s.addImage({ path, x, y, w, h, rounding: true });   // circular crop
```
SVG works in PowerPoint but not everywhere; convert to PNG with sharp for safety.

## Tables
```js
s.addTable(rows, { x, y, w, colW: [2, 3, 4], rowH: 0.4, fontSize: 12, fontFace, color,
  border: { type: "solid", pt: 0.5, color: "DDDDDD" }, fill: { color: "FFFFFF" }, valign: "middle", margin: [4, 6, 4, 6], autoPage: false });
// cell: "text" or { text, options: { bold, fill: { color }, color, align, colspan: 2, rowspan: 2 } }
```

## Charts
```js
s.addChart(pres.charts.BAR, [{ name: "Series", labels: ["A", "B"], values: [1, 2] }], {
  x, y, w, h, barDir: "col" | "bar", barGrouping: "clustered" | "stacked" | "percentStacked",
  chartColors: ["C8431F", "1B7F86"], showValue: true, dataLabelFormatCode: "0.0", dataLabelPosition: "outEnd",
  showLegend: true, legendPos: "b", showTitle: false, valAxisMinVal: 0, valAxisMaxVal: 100,
  catAxisLabelFontSize: 12, valAxisHidden: false, valGridLine: { color: "EEEEEE", size: 1 }, catGridLine: { style: "none" },
});
// types: BAR, BAR3D, LINE, AREA, PIE, DOUGHNUT, SCATTER, BUBBLE, RADAR
// combo: s.addChart([{ type: pres.charts.BAR, data, options }, { type: pres.charts.LINE, data, options: { secondaryValAxis: true } }], opts)
```

## Notes, media, misc
```js
s.addNotes("What the presenter says.");
s.background = { color: "1B1726" };          // or { path: "bg.jpg" }
s.addMedia({ type: "video", path: "clip.mp4", x, y, w, h });
s.slideNumber = { x: 9, y: 5.24, fontSize: 10 };
```

## Pitfalls
- Colors are 6-digit hex without `#`.
- Option objects are mutated by the library; build a fresh object per call.
- `breakLine` is needed between runs that should be separate paragraphs.
- Set `margin: 0` for precise placement; the default inset is ~0.1 in.
- Long tables do not paginate unless `autoPage: true`; better to split by hand.
- Scheme colors (`pres.SchemeColor.accent1`) follow the theme only after `applyTheme` patches `theme1.xml`.
