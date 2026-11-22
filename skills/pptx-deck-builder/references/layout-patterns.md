# Layout patterns (coordinates in inches, slide 10 × 5.625)

All snippets assume `const { C, HEX } = deck;` and `s = deck.slide("CONTENT", {...})`.
Content area: x 0.5–9.5 (w 9.0), y 1.45–5.05. `templates/example_deck.js` has runnable versions of patterns 1–8.

## 1. Cover (COVER master)
Kicker y 1.5, title y 1.85 (h 1.35, two lines max). Subtitle at y 3.35, people/class at y 4.1.
Optional logo on a white rounded card top-left (`card(s, 0.6, 0.45, 0.95, 0.8, C.background1)` + `fitImage` inside).
Optional motif on the right third (x ≥ 6.9): dots, large icon, or a cropped photo.

## 2. Agenda grid (3 × 2 numbered cards)
```js
const g = deck.cols(3, 0.25);
items.forEach(([num, head, desc], i) => {
  const { x, w } = g[i % 3], y = 1.45 + Math.floor(i / 3) * 1.8;
  deck.card(s, x, y, w, 1.6);
  deck.text(s, num,  { x: x + 0.22, y: y + 0.16, w: 1, h: 0.5, fontSize: 26, bold: true, color: C.accent1 });
  deck.text(s, head, { x: x + 0.22, y: y + 0.7,  w: w - 0.44, h: 0.32, fontSize: 16, bold: true });
  deck.text(s, desc, { x: x + 0.22, y: y + 1.05, w: w - 0.44, h: 0.4,  fontSize: 13, color: C.accent4 });
});
```

## 3. Flow / process (3–4 cards with arrows)
Cards at y 1.5, h 2.6 (or h 2.65 for 4 steps with w ≈ 2.03 and gap 0.3).
Icon circle top-left (d 0.6), heading to its right, body below. Arrow between cards at the card's vertical middle:
`deck.arrow(s, x + w + 0.03, yMid, x + w + gap - 0.03, yMid)`. Mark the key step with a dark card (`C.text1`) and `accent3` icon.
Finish with `deck.noteBar(s, runs)` at y 4.4.

## 4. Two columns (do / don't, before / after, pros / cons)
`deck.cols(2, 0.2)` → cards y 1.5, h 3.4. Icon circle d 0.5 + heading 20 pt, then `deck.bullets` at y 2.5.
Use `accent2` (positive) and `accent1` (negative) for the two icons.

## 5. 2 × 2 feature grid
Cards w 4.4, h 1.55 at x 0.5 / 5.1 and y 1.5 / 3.25. Icon circle d 0.7 at (x+0.3, y+0.42);
heading 18 pt at (x+1.25, y+0.38); description 15 pt `accent4` at (x+1.25, y+0.8).

## 6. Stats + screenshot
Left: three `deck.stat` cards (x 0.5, w 4.3, h 0.98, y 1.5 / 2.62 / 3.74).
Right: `fitImage` in box (5.05, 1.5, 4.45, 2.9) with `valign: "top"`, caption 12 pt italic under the returned rect,
a caveat line in `accent1` bold at y ≈ 4.1 if the numbers need context.

## 7. Big stat panel + timeline
Dark panel `card(s, 0.5, 1.45, 2.6, 3.6, C.text2)` with a 60 pt number, label and small facts.
Timeline: vertical line `s.addShape(S.LINE, { x: 4.85, y: 1.68, w: 0, h: 3.0, line: { color: HEX.accent5, width: 1.5 } })`;
per milestone (y = 1.5 + i*0.6): date right-aligned (x 3.4, w 1.25, `accent1` bold), dot (d 0.16, last one 0.22 in `accent1`), event text at x 5.08.

## 8. Chart + takeaway card
Chart box (0.5, 1.45, 5.6, 3.6); takeaway card (6.4, 1.45, 3.1, 3.6) with a bold question/heading and 2–3 lines.
Bar chart: `barDir: "bar"` for long category names; `showValue: true`; per-point colors via `chartColors` to highlight one bar.
Line chart: `deck.pres.charts.LINE`, `lineSize: 2`, `lineDataSymbol: "circle"`. Pie/doughnut only for ≤ 4 parts.

## 9. Table
`deck.table(s, header, rows, { x: 0.5, y: 1.5, w: 9, colW: [...], rowH: 0.45, fontSize: 14 })`.
Right-align numeric columns: pass cell objects `{ text: "0,93", options: { align: "right" } }` through `s.addTable` directly if needed.

## 10. Risk / issue rows (problem → action)
Three full-width cards (x 0.5, w 9, h 0.95, y 1.5 + i*1.15). Warning icon (`deck.iconImage`, `HEX.accent3`) at x 0.8,
problem text bold at x 1.45 (w 4.0), arrow 5.45 → 5.85, action in `accent2` bold at x 6.05 (w 3.3). All valign middle.

## 11. Full-width diagram (BPMN, architecture, screenshot)
`fitImage(s, file, 0.5, 1.38, 9, 3.75, alt)`. Put stats in a small right-aligned line at y 0.3 (12 pt `accent4`).
For coded processes, define an extra master with the title shifted right and add a chip:

```js
deck.pres.defineSlideMaster({
  title: "CODED", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: 0.5, y: 0.3, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 1.4, y: 0.62, w: 8.1, h: 0.6, fontSize: 28, bold: true, color: C.text1, margin: 0, valign: "middle" }, text: "" } },
  ],
  slideNumber: { x: 9.0, y: 5.24, w: 0.5, h: 0.24, fontSize: 10, color: C.accent4, align: "right" },
});
const s = deck.slide("CODED", { allowCustomMaster: true, kicker: "03 · BPMN", title: "Bán hàng trực tuyến" });
deck.chip(s, "C4", 0.5, 0.66, 0.75, 0.52, C.accent1, 18);
```

## 12. Checklist columns
Per column: icon circle d 0.42 + heading 16 pt at y 1.42; items as cards (w 4.4, h 0.6, y 1.98 + i*0.68) with text valign middle
and a small status label on the right ("Đạt", "Không có").

## 13. Closing / Q&A (DARK master)
Numbered questions: `deck.badge(s, i+1, 0.6, y, 0.45)` + 18 pt text at x 1.3 (y = 1.7 + i*0.75).
Thank-you line 22 pt bold italic `accent3` at y 4.3. Optional motif on the right.

## Section divider (optional)
DARK master with only kicker ("PHẦN 2") and title, plus a large faint number:
`deck.text(s, "02", { x: 6.5, y: 1.2, w: 3, h: 3, fontSize: 160, bold: true, color: C.text2, align: "right" })`.
