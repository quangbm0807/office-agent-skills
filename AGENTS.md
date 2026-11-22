# Agent instructions: office document skills

This repository contains two skills in the open Agent Skills format. If your agent loads `SKILL.md` files automatically, you do not need this file. Otherwise, follow these rules.

## When the user asks for slides / a presentation / a .pptx
Read `skills/pptx-deck-builder/SKILL.md` completely and follow its workflow:
check dependencies → gather content → plan an outline → write `build_deck.js` from `skills/pptx-deck-builder/templates/example_deck.js` using `scripts/deck_kit.js` → build → render with `scripts/render.js` → inspect every PNG and fix → deliver.

## When the user asks for a report / thesis / Word document / .docx
Read `skills/docx-report-builder/SKILL.md` completely and follow its workflow:
check dependencies → gather content and the required format → plan the structure → write `build_report.js` from `skills/docx-report-builder/templates/example_report.js` using `scripts/report_kit.js` (or Markdown via `r.markdown`) → build → render → inspect → deliver.

## Always
- Use absolute paths to the skill scripts.
- Do not invent facts, numbers, names or citations; mark gaps as `[TBD]` / `[cần bổ sung]` and list them for the user.
- Write in the user's language; keep Vietnamese diacritics.
- Look at the rendered pages before saying the file is done. If you cannot view images, say so.
- Keep the build script in the user's project so the document can be regenerated.
