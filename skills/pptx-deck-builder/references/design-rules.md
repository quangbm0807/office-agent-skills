# Design rules for decks

## Message
- One idea per slide. If a slide needs two titles, it is two slides.
- Titles are claims: "Chạy thử bước đầu: đạt mục tiêu", not "Kết quả".
- The kicker (small caps line above the title) names the section: `02 · KẾT QUẢ`.
- Put the take-away in a `noteBar` when the slide's point is not obvious from the visual.
- Speaker notes carry the explanation in full sentences, in the order the presenter will speak.

## Density
- ≤ 40 words of body text per slide; ≤ 5 bullets; ≤ 2 lines per bullet.
- ≤ 4 cards in a row, ≤ 6 in a grid.
- Tables: ≤ 6 rows × 4 columns on a slide. Bigger tables go in the report or an appendix slide.
- Charts: one message per chart; highlight the series that matters (`accent1`) and mute the rest (`accent5`).

## Typography (16:9, 10 × 5.625 in)
| Element | Size | Notes |
|---|---|---|
| Cover title | 30–34 pt bold | head font, up to 2 lines |
| Slide title | 28 pt bold | head font, 1 line (~45 chars) |
| Kicker | 12 pt bold, letter-spaced | caps |
| Card heading | 16–20 pt bold | |
| Body | 14–18 pt | |
| Big numbers | 26–60 pt bold | `accent1` |
| Captions, sources | 12 pt | `accent4`, italic for captions |
| Footer / slide number | 10 pt | `accent4` |

Never below 12 pt except footer. Do not mix more than two font families.

## Color
- Light slides: white background, cards in `lt2`, text `dk1`, emphasis `accent1`, secondary emphasis `accent2`, muted `accent4`.
- Dark slides (cover, section break, closing): background `dk1`, text `lt1`, highlights `accent3`, muted `accent5`.
- Use one dark card per row at most, to mark "the" item (the solution, the winner).
- Keep contrast ≥ 4.5:1 for body text. Do not put `accent3` text on white or `accent4` text on `dk1`.

## Layout
- Margins 0.5 in left/right. Title zone y 0.3–1.25. Content zone y 1.45–5.05. Footer y 5.24.
- Align everything to a few x positions; use `deck.cols(n, gap)` for equal columns.
- Gaps: 0.2–0.3 in between cards; 0.2–0.3 in padding inside cards.
- Repeat a motif (icon circles, number badges) across the deck for consistency.
- Leave white space; do not fill every inch.

## Images
- Use real screenshots, diagrams and figures from the source when they exist; crop to the relevant part (`fitImage(..., { crop })`).
- Never stretch: `fitImage` keeps aspect ratio.
- Add a short caption under screenshots and a source line for borrowed figures.
- Diagrams with small text (BPMN, architecture) get a full-width slide of their own.

## Vietnamese text
- Keep full diacritics; check that the font renders them (Calibri, Cambria, Arial, Times New Roman, Segoe UI, Georgia do).
- Decimal comma (0,997) and thousands dot (1.200) in Vietnamese content; be consistent.
- Use “ ” quotes and the en dash – for ranges (G1–G4).

## Accessibility
- `altText` on every informative image; empty altText for decorative icons.
- Do not rely on color alone; add labels or icons.
- Reading order follows creation order: add title, then content left→right, top→bottom.

## QA checklist (look at every rendered PNG)
- [ ] No text overflows or is clipped; no text touches card edges
- [ ] No unintended overlaps; arrows connect the right boxes
- [ ] Margins and alignment consistent across slides
- [ ] Titles one line (or two on the cover), no orphan word on line two
- [ ] Contrast readable, dark/light slides used on purpose
- [ ] Images sharp and not stretched; captions present
- [ ] Numbers, names, dates match the source exactly
- [ ] No leftover template text, `[TBD]` only where the user knows about it
- [ ] Slide numbers and footer present on content slides
- [ ] Speaker notes on every content slide
