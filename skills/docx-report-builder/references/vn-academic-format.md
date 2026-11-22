# Vietnamese academic report format (báo cáo, đồ án, khóa luận)

These are common defaults across Vietnamese universities. Each school publishes its own rules;
when the user has them, follow those and override the preset (`font`, `size`, margins in `kit.PRESETS`).

## Structure
1. **Bìa** (cover): cơ quan chủ quản → trường → khoa (caps, bold, centred); logo; loại báo cáo (BÁO CÁO ĐỒ ÁN / KHÓA LUẬN TỐT NGHIỆP); tên đề tài (caps, bold, 16–20 pt); GVHD, sinh viên + MSSV, lớp; địa điểm, tháng năm at the bottom.
2. **Lời cảm ơn** (optional), **Nhận xét của giảng viên** (optional, blank page with heading).
3. **Mục lục** — `r.toc()`.
4. **Danh mục hình / bảng / từ viết tắt** (optional) — tables or plain lists.
5. **MỞ ĐẦU** (unnumbered `r.h1`): lý do chọn đề tài, mục tiêu, đối tượng và phạm vi, phương pháp, bố cục báo cáo.
6. **CHƯƠNG 1..n** (`r.chapter`): usually Tổng quan / Cơ sở lý thuyết → Phân tích thiết kế → Cài đặt, thực nghiệm → Đánh giá.
7. **KẾT LUẬN** (unnumbered): kết quả đạt được, hạn chế, hướng phát triển.
8. **TÀI LIỆU THAM KHẢO** — `r.references`.
9. **PHỤ LỤC** (unnumbered `r.h1`, sub-parts with `heading(text, 2)`).

## Formatting (preset `vn-academic`)
| Item | Value |
|---|---|
| Paper | A4 portrait |
| Margins | top 2 cm, bottom 2 cm, left 3 cm, right 2 cm (some schools: top 2.5, bottom 3, left 3.5) |
| Body font | Times New Roman 13 pt (some schools 12 or 14) |
| Line spacing | 1.5 lines, 6 pt after paragraphs |
| Paragraph | justified, first-line indent 1 cm |
| Chapter heading | 14 pt bold caps centred, new page: `CHƯƠNG 1. TỔNG QUAN` |
| Level 2 / 3 | 13 pt bold `1.1.` / 13 pt bold italic `1.1.1.`; avoid going deeper than 4 levels |
| Page numbers | bottom centre, starting at 1 after the cover |
| Figure caption | below the figure, centred: `Hình 2.3: ...` |
| Table caption | above the table, centred: `Bảng 2.1: ...` |
| Source of borrowed figures | add "(Nguồn: [3])" at the end of the caption |

## Writing style
- Impersonal, precise: "Hệ thống sử dụng...", "Nhóm đề xuất...". Avoid "em", "chúng em" outside Lời cảm ơn.
- Every figure and table must be referenced in the text before it appears: "như Hình 2.3 cho thấy".
- Define abbreviations at first use: "mạng nơ-ron tích chập (CNN)".
- Numbers: decimal comma (0,95), thousands dot (12.500), units with a space (300 ms).
- Keep English technical terms in italics on first use if there is no common Vietnamese term.

## Citations
Ask which style the school uses. Defaults:

**IEEE** (technical faculties) — in text `[1]`, `[2], [5]`, `[3]–[6]`; list in order of first citation:
- Bài báo: `A. Tác giả, B. Tác giả, “Tên bài,” *Tên tạp chí*, vol. 12, no. 3, pp. 45–67, 2023.`
- Hội nghị: `A. Tác giả, “Tên bài,” in *Proc. Tên hội nghị*, 2019, pp. 1–9.`
- Sách: `A. Tác giả, *Tên sách*, 2nd ed. Thành phố: NXB, 2020.`
- Website: `Tên tổ chức, “Tên trang,” 2024. [Online]. Available: https://... (truy cập 12/11/2026).`

**APA 7** (economics, social sciences) — in text `(Nguyễn, 2021)`; list sorted by surname:
- `Nguyễn, V. A., & Trần, B. (2021). Tên bài. *Tên tạp chí, 12*(3), 45–67. https://doi.org/...`

Vietnamese authors are listed with full name in natural order under IEEE ("Nguyễn Văn A") and by family name under APA.
Sort Vietnamese and foreign references in separate groups if the school requires it (Vietnamese first).

## Checklist before delivering
- [ ] Cover fits on one page; title correct and complete
- [ ] TOC present (remind user to update fields in Word)
- [ ] Chapters numbered 1..n, sections 1.1, 1.1.1 with no gaps
- [ ] Every figure/table has a numbered caption and is referenced in text
- [ ] Citations in text match the reference list; style consistent
- [ ] No orphan headings at page bottom; no half-empty pages except before chapters
- [ ] Page numbers start after the cover
- [ ] Spelling and diacritics checked
