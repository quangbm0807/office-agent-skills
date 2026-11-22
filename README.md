# office-agent-skills

Bộ skill giúp AI agent **làm slide PowerPoint (.pptx)** và **viết báo cáo Word (.docx)** bằng code, rồi tự render ra ảnh để kiểm tra trước khi giao.

Skill viết theo chuẩn mở [Agent Skills](https://agentskills.io) (mỗi skill là một thư mục có file `SKILL.md`), nên dùng được với **Google Antigravity**, **Claude Code**, **Gemini CLI**, **OpenAI Codex** và các agent khác đọc cùng định dạng. Agent không hỗ trợ skill vẫn dùng được qua file [AGENTS.md](AGENTS.md).

## Có gì trong bộ này

| Skill | Dùng khi | Điểm chính |
|---|---|---|
| [`pptx-deck-builder`](skills/pptx-deck-builder/SKILL.md) | "Làm slide", "bài thuyết trình", chuyển báo cáo .docx thành slide | pptxgenjs + slide master có theme, icon, thẻ, biểu đồ, bảng, ghi chú thuyết trình; tự cảnh báo chữ tràn khung; 4 theme có sẵn |
| [`docx-report-builder`](skills/docx-report-builder/SKILL.md) | "Viết báo cáo", "đồ án", "khóa luận", file Word | Bìa, mục lục, CHƯƠNG / 1.1 / 1.1.1 tự đánh số, Hình/Bảng tự đánh số theo chương, tài liệu tham khảo; nhận nội dung Markdown; preset chuẩn báo cáo Việt Nam |

Cả hai skill đều có:
- `scripts/render.js`: chuyển .pptx / .docx / .pdf thành PDF và ảnh PNG từng trang để agent tự "nhìn" kết quả.
- `scripts/extract_docx.js`: rút chữ và hình từ một file Word có sẵn (để làm slide từ báo cáo).
- `scripts/check_deps.js`: kiểm tra máy đã cài đủ thư viện chưa và in lệnh cài.
- `templates/`: script mẫu chạy được ngay, agent copy rồi sửa nội dung.
- `references/`: quy tắc thiết kế, các mẫu bố cục, cheat sheet API, quy chuẩn trình bày báo cáo tiếng Việt.

```
office-agent-skills/
├── AGENTS.md                 # hướng dẫn cho agent không hỗ trợ SKILL.md
├── install.ps1 / install.sh  # cài skill vào thư mục của từng agent
├── package.json              # npm test = build + render hai ví dụ
└── skills/
    ├── pptx-deck-builder/
    │   ├── SKILL.md
    │   ├── scripts/   deck_kit.js, apply_theme.js, render.js, extract_docx.js, check_deps.js
    │   ├── templates/ example_deck.js
    │   └── references/ design-rules.md, layout-patterns.md, pptxgenjs-cheatsheet.md
    └── docx-report-builder/
        ├── SKILL.md
        ├── scripts/   report_kit.js, render.js, extract_docx.js, check_deps.js
        ├── templates/ example_report.js
        └── references/ vn-academic-format.md, docx-cheatsheet.md
```

## Yêu cầu

- **Node.js 18+**
- Thư viện npm (cài một lần, toàn cục hoặc trong project):
  ```bash
  npm install -g pptxgenjs docx sharp react react-dom react-icons
  ```
- Để agent tự kiểm tra bằng hình (nên có):
  - **LibreOffice**: https://www.libreoffice.org/download/
  - **Poppler** (`pdftoppm`): Windows `winget install oschwartz10612.Poppler` (hoặc có sẵn nếu đã cài MiKTeX), macOS `brew install poppler`, Linux `apt install poppler-utils`

Kiểm tra: `node skills/pptx-deck-builder/scripts/check_deps.js`

## Cài đặt

```bash
git clone https://github.com/quangbm0807/office-agent-skills.git
cd office-agent-skills
```

### Cách 1: script cài đặt

Windows (PowerShell):
```powershell
.\install.ps1                        # cài cho mọi agent
.\install.ps1 -Target antigravity    # chỉ Antigravity
.\install.ps1 -Project D:\du-an      # chỉ cho một project (D:\du-an\.agents\skills)
```
Nếu PowerShell chặn script: `powershell -ExecutionPolicy Bypass -File .\install.ps1`

macOS / Linux / Git Bash:
```bash
./install.sh                  # mọi agent
./install.sh antigravity      # chỉ Antigravity
./install.sh --link claude    # tạo symlink, sửa trong repo là agent thấy ngay
./install.sh --project ~/du-an
```

### Cách 2: copy tay

Copy từng thư mục trong `skills/` vào đúng chỗ:

| Agent | Toàn cục (mọi project) | Trong một project |
|---|---|---|
| **Antigravity** | `~/.gemini/config/skills/` (bản cũ: `~/.gemini/antigravity/skills/`) | `<project>/.agents/skills/` (bản cũ: `.agent/skills/`) |
| Claude Code | `~/.claude/skills/` | `<project>/.claude/skills/` |
| Gemini CLI | `~/.gemini/skills/` | `<project>/.gemini/skills/` |
| Codex và agent khác dùng thư mục chung | `~/.agents/skills/` | `<project>/.agents/skills/` |

`~` trên Windows là `C:\Users\<tên-bạn>`.

> Lưu ý với Antigravity trên Windows: đã có báo cáo agent không tự thấy skill toàn cục. Nếu gặp, cài theo project (`.\install.ps1 -Project <thư-mục-project>`) hoặc nhắc tên skill trong câu lệnh.

### Agent không hỗ trợ SKILL.md

Copy [AGENTS.md](AGENTS.md) vào project (hoặc dán nội dung vào file quy tắc của agent: `.cursorrules`, `.github/copilot-instructions.md`, ...) và để thư mục `skills/` ở chỗ agent đọc được.

## Cách dùng

Chỉ cần nói với agent, ví dụ:

- "Làm bộ slide 10 trang báo cáo tiến độ đồ án từ file `BaoCao.docx`, theme navy-teal, có ghi chú thuyết trình."
- "Viết báo cáo đồ án dạng Word theo chuẩn trường, nội dung trong `noidung.md`, bìa trường ĐH ABC, GVHD ThS. Nguyễn Văn A."
- "Chuyển file `notes.md` thành báo cáo .docx kiểu doanh nghiệp (preset modern), tiếng Anh."

Agent sẽ: kiểm tra thư viện → đọc nội dung → lên dàn ý → viết script `build_deck.js` / `build_report.js` trong project → build → render ra PNG → tự sửa lỗi bố cục → giao file.

Tự chạy ví dụ:
```bash
npm install          # hoặc dùng bản cài toàn cục
npm test             # build + render hai file mẫu vào thư mục out/
```

## Đưa lên Git

```bash
cd office-agent-skills
git init
git add .
git commit -m "Add pptx-deck-builder and docx-report-builder skills"
git branch -M main
git remote add origin https://github.com/quangbm0807/office-agent-skills.git
git push -u origin main
```

Máy khác chỉ cần `git clone` rồi chạy `install.ps1` / `install.sh`. Khi cập nhật: `git pull` rồi chạy lại script cài (hoặc dùng `--link` để khỏi cài lại).

## Tuỳ biến

- **Theme slide**: thêm preset vào `THEMES` trong `skills/pptx-deck-builder/scripts/deck_kit.js`, giữ đúng vai trò màu (xem `SKILL.md`).
- **Quy chuẩn báo cáo của trường**: sửa preset `vn-academic` trong `skills/docx-report-builder/scripts/report_kit.js` (lề, font, cỡ chữ, giãn dòng), hoặc truyền `font`, `size` khi gọi `createReport`.
- `_deps.js` và `render.js` được copy giống hệt vào cả hai skill để mỗi skill tự chạy độc lập. Sửa một bản thì chạy `npm run sync` để chép sang bản kia.

## Giấy phép

MIT, xem [LICENSE](LICENSE).
