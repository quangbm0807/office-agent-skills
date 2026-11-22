---
name: docx-report-builder
description: Write Word (.docx) reports in code with the docx npm package, covering cover page, table of contents, numbered chapters and headings, figures and tables with auto-numbered captions, lists, references, page numbers, and Markdown input, then render pages to PNG to check them. Includes a Vietnamese academic preset (Times New Roman 13, 1.5 spacing, Chương/Hình/Bảng numbering). Use when the user asks for a report, thesis, project write-up, proposal, "báo cáo", "đồ án", "khóa luận", "tiểu luận", a .docx/Word file, or wants Markdown or notes turned into a formatted Word document.
---

# DOCX Report Builder

Build the report as a Node.js script on top of `scripts/report_kit.js`, save, render to PNG, look, fix, repeat.

`SKILL_DIR` below means the folder that contains this `SKILL.md`. Use its absolute path in commands.

## 1. Check the environment (once per machine)

```bash
node SKILL_DIR/scripts/check_deps.js
```

Required: Node 18+, `docx` (v9), `sharp`. Visual checks need LibreOffice and Poppler (`pdftoppm`). Install in the user's project or globally; the kit finds both.

## 2. Gather the content and the rules

- Ask which format applies: the school's/company's template beats any preset. If the user has a template .docx, read its rules (margins, fonts, heading style, caption style, citation style) and pass them as options.
- Existing Word file as source: `node SKILL_DIR/scripts/extract_docx.js old.docx extracted/` gives `content.md`, `images.json`, `media/`.
- Never invent data, citations, results or names. Missing facts become `[cần bổ sung]` / `[TBD]`, listed to the user at the end.

## 3. Plan the structure

Typical Vietnamese academic report (details in `references/vn-academic-format.md`):
cover → (lời cảm ơn, nhận xét GV) → mục lục → (danh mục hình/bảng, từ viết tắt) → MỞ ĐẦU → CHƯƠNG 1..n → KẾT LUẬN → TÀI LIỆU THAM KHẢO → PHỤ LỤC.

Business/technical report (`preset: "modern"`): title page → contents → executive summary → sections → recommendations → appendix.

## 4. Write the build script

Copy `SKILL_DIR/templates/example_report.js` into the user's project as `build_report.js`. Set `KIT` to the absolute path of `SKILL_DIR/scripts/report_kit.js` (or set env `REPORT_KIT`). Replace the content.

```js
const r = kit.createReport({ preset: "vn-academic" | "modern", lang: "vi" | "en", title, author, header,
                             font, size, accent, numberHeadings });
```

| Call | Result |
|---|---|
| `r.cover({ top: [...], logo, kind, title, subtitle, info: [[label, value]], bottom })` | Cover page (own section, no page number) |
| `r.toc()` | "MỤC LỤC" + Word TOC field + page break |
| `r.chapter("Tổng quan")` | `CHƯƠNG 1. TỔNG QUAN` on a new page; resets figure/table numbers |
| `r.h1("MỞ ĐẦU")` | Unnumbered top-level heading on a new page |
| `r.h2(text)` / `r.h3(text)` | `1.1. text` / `1.1.1. text` (plain when `numberHeadings: false`) |
| `r.p("text with **bold**, *italic*, `code`")` | Body paragraph (justified, first-line indent in vn-academic) |
| `r.bullets([...])` / `r.numbered([...])` | Lists; a nested array is the next level; each `numbered` restarts at 1 |
| `r.quote(text)` | Indented italic block |
| `await r.figure(pathOrBuffer, { caption, width: 0.8 })` | Centred image (PNG/JPG/SVG/WebP), caption `Hình 1.2: ...` below |
| `r.table({ header, rows, widths, align, caption })` | Table, caption `Bảng 1.1: ...` above, header row repeats on new pages |
| `await r.markdown(md, { baseDir })` | Markdown body: `#` chapter (`# X {-}` unnumbered), `##`, `###`, lists, `>`, `![cap](img){width=0.6}`, pipe tables (line `Bảng: caption` above), `---` page break |
| `r.references([...])` | Numbered reference list `[1] ...` with hanging indent |
| `r.pageBreak()` | Page break |
| `await r.save("out.docx")` | Write the file |

Markdown input is the fastest path when the content is long: draft `content.md`, then `await r.markdown(fs.readFileSync("content.md", "utf8"), { baseDir: __dirname })`. Mix API calls and Markdown freely.

For things the kit does not cover (landscape pages, footnotes, hyperlinks, multi-column sections, custom headers), use the `docx` package directly: see `references/docx-cheatsheet.md`.

## 5. Build, render, inspect

```bash
node build_report.js out/report.docx
node SKILL_DIR/scripts/render.js out/report.docx out/render --dpi 70
```

Open the PNGs and check: cover centred and on one page, headings numbered correctly, no heading stranded at a page bottom, figures sharp and not wider than the text, captions numbered in order (Hình 1.1, 1.2, 2.1...), tables fit the width, lists indented consistently, page numbers present from the first page after the cover, Vietnamese diacritics intact. Fix and rebuild until clean. If you cannot view images, say so.

The table of contents is a Word field: LibreOffice previews show entries without page numbers; Word fills them when the file opens (it asks to update fields; or right-click → Update Field / F9). Tell the user this.

## 6. Deliver

Give the `.docx` path, the outline (chapters and sections), the list of `[TBD]` gaps, and the reminder to update the TOC in Word. Keep `build_report.js` (and `content.md`) for regeneration.

## Gotchas

- `docx` sizes: font size in half-points, spacing/indent in twips (1 cm = 567, 1 pt = 20). The kit converts for you.
- Do not type numbers into headings or captions; the kit numbers them. Do not type "•" for bullets.
- Images larger than ~75% of the page height are scaled down automatically; for very wide diagrams use `width: 1`.
- Times New Roman / Calibri / Cambria render Vietnamese correctly. Avoid fonts without Vietnamese glyphs.
- One `numbered()` call = one list that starts at 1. Split calls to restart numbering.

## Files

- `scripts/report_kit.js` helper library · `scripts/render.js` DOCX/PPTX/PDF → PDF + PNG · `scripts/extract_docx.js` text + images from an existing .docx · `scripts/check_deps.js`
- `templates/example_report.js` cover, TOC, API chapter, Markdown chapter, figure, tables, references
- `references/vn-academic-format.md` Vietnamese report structure, formatting and citation rules
- `references/docx-cheatsheet.md` raw `docx` API for advanced layout
