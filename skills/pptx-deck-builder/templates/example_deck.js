// Example deck: one slide per common layout pattern.
// Copy this file into the user's project, point KIT at the skill's deck_kit.js,
// replace the content, delete the patterns you do not need.
//
//   node build_deck.js out/deck.pptx
//
const path = require("path");
// Absolute path to <SKILL_DIR>/scripts/deck_kit.js once copied into a project.
const KIT = process.env.DECK_KIT || path.join(__dirname, "..", "scripts", "deck_kit.js");
const kit = require(KIT);
const fa = kit.requireDep("react-icons/fa");
const sharp = kit.requireDep("sharp");

const OUT = process.argv[2] || "example_deck.pptx";

async function main() {
  const deck = kit.createDeck({
    theme: "plum-coral", // or "charcoal-red", "navy-teal", "forest-amber", or a custom theme object
    title: "Mini Photos — Báo cáo tiến độ",
    author: "Nhóm 1",
    footer: "Mini Photos · Báo cáo tiến độ",
  });
  const { C, HEX, pres } = deck;

  // ---------- 1. Cover (dark) ----------
  {
    const s = deck.slide("COVER", {
      section: "Mở đầu",
      kicker: "BÁO CÁO TIẾN ĐỘ · TUẦN 6",
      title: "Gom ảnh theo khuôn mặt, chạy hoàn toàn trên máy cá nhân",
      notes: "Chào thầy cô. Nhóm trình bày tiến độ tuần 6 của đề tài Mini Photos.",
    });
    deck.text(s, "Mini Photos — tự động gom ảnh theo người", { x: 0.6, y: 3.35, w: 8.8, h: 0.4, fontSize: 16, italic: true, color: C.accent5 });
    deck.text(s, [
      { text: "GVHD: ", options: { bold: true, color: C.accent3 } },
      { text: "ThS. Nguyễn Văn A", options: { breakLine: true } },
      { text: "Nhóm: ", options: { bold: true, color: C.accent3 } },
      { text: "Trần B · Lê C" },
    ], { x: 0.6, y: 4.1, w: 6.0, h: 0.75, fontSize: 14, color: C.background1, paraSpaceAfter: 4 });
  }

  // ---------- 2. Agenda: numbered cards in a 3 x 2 grid ----------
  {
    const s = deck.slide("CONTENT", { kicker: "NỘI DUNG", title: "Nội dung trình bày", notes: "Bài gồm sáu phần." });
    const items = [
      ["01", "Vấn đề", "Vì sao tìm ảnh theo người khó"],
      ["02", "Mục tiêu", "Bốn mục tiêu đo được"],
      ["03", "Giải pháp", "Quy trình bốn bước"],
      ["04", "Kết quả", "Số liệu chạy thử"],
      ["05", "Rủi ro", "Ba rủi ro và cách xử lý"],
      ["06", "Kế hoạch", "Việc của các tuần tới"],
    ];
    const grid = deck.cols(3, 0.25);
    items.forEach(([num, head, desc], i) => {
      const { x, w } = grid[i % 3];
      const y = 1.45 + Math.floor(i / 3) * 1.8;
      deck.card(s, x, y, w, 1.6, C.background2, "agenda " + num);
      deck.text(s, num, { x: x + 0.22, y: y + 0.16, w: 1, h: 0.5, fontSize: 26, bold: true, color: C.accent1, fontFace: deck.theme.fonts.head });
      deck.text(s, head, { x: x + 0.22, y: y + 0.7, w: w - 0.44, h: 0.32, fontSize: 16, bold: true });
      deck.text(s, desc, { x: x + 0.22, y: y + 1.05, w: w - 0.44, h: 0.4, fontSize: 13, color: C.accent4 });
    });
  }

  // ---------- 3. Flow: input → process → output, with a take-away bar ----------
  {
    const s = deck.slide("CONTENT", {
      section: "Vấn đề",
      kicker: "01 · VẤN ĐỀ",
      title: "Tìm ảnh theo người vẫn phải lướt tay",
      notes: "Đầu vào là kho ảnh chưa gắn tên; ứng dụng tự gom; đầu ra là mỗi nhóm một người.",
    });
    const flow = [
      { Icon: fa.FaImages, head: "Đầu vào", body: "Kho ảnh chưa gắn tên ai", dark: false },
      { Icon: fa.FaMagic, head: "Mini Photos", body: "Tự tìm khuôn mặt và gom theo người", dark: true },
      { Icon: fa.FaUsers, head: "Đầu ra", body: "Mỗi nhóm là một người; đặt tên, sửa được", dark: false },
    ];
    const grid = deck.cols(3, 0.3);
    for (const [i, f] of flow.entries()) {
      const { x, w } = grid[i];
      deck.card(s, x, 1.5, w, 2.6, f.dark ? C.text1 : C.background2, "flow " + f.head);
      await deck.iconCircle(s, f.Icon, x + 0.25, 1.75, 0.6, f.dark ? C.accent3 : C.accent1, "flow icon " + f.head);
      deck.text(s, f.head, { x: x + 1.0, y: 1.75, w: w - 1.2, h: 0.6, fontSize: 18, bold: true, valign: "middle", color: f.dark ? C.background1 : C.text1 });
      deck.text(s, f.body, { x: x + 0.25, y: 2.6, w: w - 0.5, h: 1.2, fontSize: 15, color: f.dark ? C.background1 : C.text1 });
      if (i < 2) deck.arrow(s, x + w + 0.03, 2.8, x + w + 0.27, 2.8, "flow arrow " + i);
    }
    deck.noteBar(s, [
      { text: "Điểm khó: ", options: { bold: true, color: C.accent3 } },
      { text: "không biết trước có bao nhiêu người → bài toán gom cụm không giám sát." },
    ]);
  }

  // ---------- 4. Two columns: do / don't ----------
  {
    const s = deck.slide("CONTENT", { kicker: "01 · VẤN ĐỀ", title: "Phạm vi đề tài", notes: "Những gì nhóm làm và không làm." });
    const columns = [
      { Icon: fa.FaCheck, fill: C.accent2, head: "Nhóm sẽ làm", items: ["Web quản lý ảnh chạy trên máy", "Tự gom khuôn mặt theo người", "Đặt tên, gộp, sửa chỗ xếp nhầm"] },
      { Icon: fa.FaTimes, fill: C.accent1, head: "Không làm", items: ["Nhiều tài khoản, chia sẻ album", "Ứng dụng mobile, đưa lên cloud"] },
    ];
    const grid = deck.cols(2, 0.2);
    for (const [i, c] of columns.entries()) {
      const { x, w } = grid[i];
      deck.card(s, x, 1.5, w, 3.4, C.background2, "scope " + c.head);
      await deck.iconCircle(s, c.Icon, x + 0.3, 1.75, 0.5, c.fill, "scope icon " + c.head);
      deck.text(s, c.head, { x: x + 0.95, y: 1.75, w: w - 1.2, h: 0.5, fontSize: 20, bold: true, valign: "middle" });
      deck.bullets(s, c.items, { x: x + 0.3, y: 2.5, w: w - 0.6, h: 2.2, fontSize: 16 });
    }
  }

  // ---------- 5. Stats + image ----------
  {
    const s = deck.slide("CONTENT", {
      section: "Kết quả",
      kicker: "02 · KẾT QUẢ",
      title: "Chạy thử bước đầu: đạt mục tiêu",
      notes: "F1 0,997; 131 ms mỗi ảnh; tìm đúng 10/10 người.",
    });
    const stats = [["0,997", "điểm F1", "cần ≥ 0,90"], ["131 ms", "mỗi ảnh", "cần ≤ 300 ms"], ["10 / 10", "người tìm đúng", "120 ảnh"]];
    stats.forEach(([v, l, sub], i) => deck.stat(s, v, l, sub, 0.5, 1.5 + i * 1.12, 4.3, 0.98));
    // Any PNG/JPG path works here; this one is generated so the example runs without assets.
    const placeholder = await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="#${HEX.lt2}"/>` +
      `<rect x="60" y="60" width="1160" height="80" rx="16" fill="#${HEX.dk1}"/>` +
      Array.from({ length: 10 }, (_, i) => `<circle cx="${180 + (i % 5) * 230}" cy="${330 + Math.floor(i / 5) * 260}" r="85" fill="#${[HEX.accent1, HEX.accent2, HEX.accent3][i % 3]}"/>`).join("") +
      `</svg>`)).png().toBuffer();
    const r = await deck.fitImage(s, placeholder, 5.05, 1.5, 4.45, 2.9, "Ảnh chụp màn hình trang Mọi người", { valign: "top" });
    deck.text(s, "Trang “Mọi người” sau khi gom 120 ảnh", { x: r.x, y: r.y + r.h + 0.08, w: r.w, h: 0.3, fontSize: 12, italic: true, color: C.accent4 });
  }

  // ---------- 6. Chart ----------
  {
    const s = deck.slide("CONTENT", { kicker: "02 · KẾT QUẢ", title: "HDBSCAN cho F1 cao nhất trên LFW", notes: "So sánh ba thuật toán gom cụm." });
    s.addChart(pres.charts.BAR, [{ name: "F1", labels: ["K-means", "DBSCAN", "Agglomerative", "HDBSCAN"], values: [0.81, 0.93, 0.95, 0.997] }], {
      x: 0.5, y: 1.45, w: 5.6, h: 3.6, barDir: "bar", showValue: true, dataLabelFormatCode: "0.000",
      valAxisMinVal: 0, valAxisMaxVal: 1, showLegend: false,
      ...deck.chartStyle(),
      chartColors: [HEX.accent5, HEX.accent5, HEX.accent5, HEX.accent1], // highlight the winner only
    });
    deck.card(s, 6.4, 1.45, 3.1, 3.6, C.background2, "chart takeaway");
    deck.text(s, [
      { text: "Vì sao HDBSCAN?", options: { bold: true, fontSize: 16, breakLine: true } },
      { text: "Tự tìm số người, để riêng khuôn mặt không chắc chắn thay vì ép vào một nhóm.", options: { fontSize: 14 } },
    ], { x: 6.65, y: 1.7, w: 2.6, h: 3.1, paraSpaceAfter: 8 });
  }

  // ---------- 7. Table ----------
  {
    const s = deck.slide("CONTENT", { section: "Rủi ro", kicker: "03 · RỦI RO", title: "Rủi ro và cách xử lý", notes: "Ba rủi ro chính." });
    deck.table(s, ["Rủi ro", "Ảnh hưởng", "Cách xử lý"], [
      ["Chưa có album ảnh thật", "Không đo được G2", "Dùng ảnh công khai, tự gán nhãn"],
      ["Ảnh lúc nhỏ và lúc lớn bị tách", "Một người thành hai nhóm", "Gợi ý gộp, cho sửa tay"],
      ["Anh em ruột bị gộp nhầm", "Hai người thành một nhóm", "Ngưỡng chặt, gán tạm ảnh mới"],
    ], { x: 0.5, y: 1.5, w: 9.0, colW: [3.2, 2.6, 3.2], fontSize: 14 });
  }

  // ---------- 8. Closing (dark) ----------
  {
    const s = deck.slide("DARK", { section: "Kết thúc", kicker: "XIN Ý KIẾN", title: "Nhóm mong thầy cô góp ý", notes: "Ba câu hỏi xin ý kiến. Cảm ơn thầy cô." });
    const qs = ["Mục tiêu G1–G4 đã phù hợp chưa?", "Có cần thêm bộ dữ liệu chuẩn ngoài LFW?", "Chuẩn trích dẫn: IEEE hay APA?"];
    qs.forEach((q, i) => {
      const y = 1.7 + i * 0.75;
      deck.badge(s, i + 1, 0.6, y, 0.45, C.accent1);
      deck.text(s, q, { x: 1.3, y, w: 7.5, h: 0.45, fontSize: 18, color: C.background1, valign: "middle" });
    });
    deck.text(s, "Cảm ơn thầy cô đã lắng nghe!", { x: 0.6, y: 4.3, w: 8.0, h: 0.5, fontSize: 22, bold: true, italic: true, color: C.accent3 });
  }

  await deck.save(OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
