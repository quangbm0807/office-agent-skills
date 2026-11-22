---
name: pptx-deck-builder
description: Build polished PowerPoint (.pptx) decks in code with pptxgenjs, using themed slide masters, icon cards, charts, tables, images and speaker notes, then render every slide to PNG to check it visually. Use when the user asks for slides, a deck, a presentation, a pitch, a .pptx file, "làm slide", "bài thuyết trình", "slide báo cáo", or wants to turn a report, .docx, PDF or notes into slides. Works on Windows, macOS and Linux with Node.js.
---

# PPTX Deck Builder

Build decks as a Node.js script on top of `scripts/deck_kit.js`, save, render to PNG, look, fix, repeat.

`SKILL_DIR` below means the folder that contains this `SKILL.md`. Use its absolute path in commands.

## 1. Check the environment (once per machine)

```bash
node SKILL_DIR/scripts/check_deps.js
```

It reports missing npm packages and prints the install command. Required: Node 18+, `pptxgenjs`, `sharp`. Icons need `react`, `react-dom`, `react-icons`. Visual checks need LibreOffice and Poppler (`pdftoppm`). Install packages in the user's project (`npm install ...`) or globally (`npm install -g ...`); the kit finds both.

## 2. Gather the content

- From a Word report: `node SKILL_DIR/scripts/extract_docx.js report.docx extracted/` gives `content.md` (text in reading order with image markers), `images.json` (each picture with the heading above it and its caption) and `media/`. Read all of `content.md` before planning.
- From a PDF: use `pdftotext -layout file.pdf -` (Poppler) or any PDF reader you have; `pdfimages -png file.pdf out/img` pulls the pictures.
- From notes or a conversation: ask only for what is missing (audience, length, language, deadline facts). Never invent numbers, names or results; mark gaps as `[cần bổ sung]` / `[TBD]` and tell the user.

## 3. Plan before writing code

Write an outline table first and show it to the user for long or high-stakes decks:

| # | Master | Kicker | Title (one claim) | Layout pattern | Content | Notes |
|---|---|---|---|---|---|---|

Rules:
- One message per slide. The title states the point ("HDBSCAN cho F1 cao nhất"), not the topic ("Kết quả").
- Body text is short: at most ~40 words per slide. Detail goes in speaker notes (`notes:`), written as what the presenter will say.
- Write in the user's language. Vietnamese must keep full diacritics.
- Typical arc: cover → agenda → problem → goal → solution → results → risks/next steps → closing/Q&A. Use sections (`section:`) for each part.
- Pick a layout pattern per slide from `references/layout-patterns.md`; vary them so consecutive slides do not look identical.

## 4. Choose a theme

Presets: `plum-coral`, `charcoal-red`, `navy-teal`, `forest-amber`. Or pass a custom object:

```js
{ name: "Brand", fonts: { head: "Cambria", body: "Calibri" },
  colors: { dk1, lt1, dk2, lt2, accent1, accent2, accent3, accent4, accent5, accent6 } } // hex
```

Keep the color roles, because every helper relies on them: `dk1` ink / dark backgrounds, `lt1` white, `dk2` second dark, `lt2` card fill, `accent1` primary, `accent2` secondary, `accent3` highlight that reads on `dk1`, `accent4` muted text that reads on white, `accent5` soft lines (muted text on dark), `accent6` deep primary. Use fonts installed on the target machine (Calibri, Cambria, Arial, Georgia, Segoe UI all support Vietnamese).

## 5. Write the build script

Copy `SKILL_DIR/templates/example_deck.js` into the user's project as `build_deck.js`. Set `KIT` to the absolute path of `SKILL_DIR/scripts/deck_kit.js` (or set the env var `DECK_KIT`). Replace the example slides with the planned ones and delete unused patterns.

Core API (`const deck = kit.createDeck({ theme, title, author, footer })`):

| Call | What it does |
|---|---|
| `deck.slide(master, { section, kicker, title, notes })` | New slide. Masters: `COVER` (dark), `CONTENT` (light, footer + number), `DARK` (dark content/closing) |
| `deck.text(s, textOrRuns, { x, y, w, h, fontSize, bold, color, align, valign })` | Text box, zero margin, top-aligned by default |
| `deck.bullets(s, items, box)` | Real bulleted list (never type "•" yourself) |
| `deck.card(s, x, y, w, h, fill, name)` / `deck.rect(...)` | Rounded / square panel |
| `await deck.iconCircle(s, Icon, x, y, d, fill)` | Colored circle with a white react-icons icon |
| `await deck.iconImage(s, Icon, x, y, size, hex)` | Bare icon |
| `deck.arrow(s, x1, y1, x2, y2)` | Connector with arrow head |
| `deck.badge(s, n, x, y, d)` / `deck.chip(s, "G1", x, y, w, h)` | Number circle / pill label |
| `deck.noteBar(s, runs)` | Dark take-away strip at the bottom |
| `deck.stat(s, value, label, sub, x, y, w, h)` | Big number card |
| `await deck.fitImage(s, pathOrBuffer, x, y, w, h, altText, { valign, crop })` | Image fitted inside a box, aspect kept; returns placed rect |
| `deck.table(s, header, rows, { x, y, w, colW, rowH, fontSize })` | Table with dark header row |
| `s.addChart(deck.pres.charts.BAR, data, { ...deck.chartStyle(), x, y, w, h })` | Theme-matched chart |
| `deck.cols(n, gap)` | Equal column `{x, w}` positions across the 9 in content width |
| `await deck.save("out.pptx")` | Write file, apply theme, print layout warnings |

Use `deck.C.*` (scheme colors) for shapes and text, `deck.HEX.*` for charts and icons. The slide is 10 × 5.625 in; content area x 0.5–9.5, y 1.45–5.05. Text runs: `[{ text, options: { bold, color, breakLine: true } }, ...]`. Anything not covered by the kit: use `deck.pres` / the slide object directly (see `references/pptxgenjs-cheatsheet.md`).

## 6. Build, render, inspect

```bash
node build_deck.js out/deck.pptx
node SKILL_DIR/scripts/render.js out/deck.pptx out/render
```

1. Fix every layout warning printed by `save()` (text that may overflow, boxes off the slide). The estimate is approximate; confirm in the images.
2. Open every PNG in `out/render/` and check: no overflowing or clipped text, nothing overlapping by accident, consistent margins and alignment, readable contrast, no empty/placeholder text, images not stretched, titles on one line where intended, numbers and names match the source.
3. Fix and repeat until clean. If you cannot view images, say so and rely on the warnings plus a text review of the script.

LibreOffice may substitute fonts (e.g. Carlito for Calibri), so spacing can differ slightly from PowerPoint; leave ~10% slack in text boxes.

## 7. Deliver

Give the path to the `.pptx`, a one-line-per-slide summary, and anything left open (`[TBD]` items, assumptions). Keep `build_deck.js` so the deck can be regenerated after edits.

## Gotchas

- Hex colors have no `#` in pptxgenjs. Charts need hex, not scheme colors.
- pptxgenjs mutates option objects: create a fresh object for each call, never reuse one.
- Titles at 28 pt fit about 45 characters on one line in the 9 in title box; shorten rather than shrink.
- Minimum font size 12 pt (footer 10 pt). Body 14–18 pt.
- Give images `altText`, give shapes `objectName`, so the deck is accessible and editable.
- `applyTheme` is what makes scheme colors right; if you bypass `deck.save()`, run `node SKILL_DIR/scripts/apply_theme.js out.pptx theme.json`.

## Files

- `scripts/deck_kit.js` helper library · `scripts/apply_theme.js` theme writer · `scripts/render.js` PPTX/DOCX/PDF → PDF + PNG · `scripts/extract_docx.js` report text + images · `scripts/check_deps.js` environment check
- `templates/example_deck.js` one slide per common pattern
- `references/design-rules.md` typography, color, density, QA checklist
- `references/layout-patterns.md` coordinates for each layout pattern, custom masters
- `references/pptxgenjs-cheatsheet.md` raw pptxgenjs API for things the kit does not wrap
