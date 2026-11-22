// Example report: cover, table of contents, chapters written with the API and with Markdown,
// a figure, a table, lists and references.
// Copy this file into the user's project, point KIT at the skill's report_kit.js,
// replace the content.
//
//   node build_report.js out/report.docx
//
const path = require("path");
const KIT = process.env.REPORT_KIT || path.join(__dirname, "..", "scripts", "report_kit.js");
const kit = require(KIT);
const sharp = kit.requireDep("sharp");

const OUT = process.argv[2] || "example_report.docx";

async function main() {
  const r = kit.createReport({
    preset: "vn-academic", // or "modern"
    lang: "vi",            // "en" switches labels to Chapter / Figure / Table / Contents / References
    title: "Báo cáo chuyên đề: Mini Photos",
    author: "Trần B, Lê C",
    header: "Mini Photos — Báo cáo chuyên đề",
  });

  r.cover({
    top: ["ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH", "TRƯỜNG ĐẠI HỌC ABC", "KHOA HỆ THỐNG THÔNG TIN"],
    // logo: "assets/logo.png",
    kind: "BÁO CÁO CHUYÊN ĐỀ TỐT NGHIỆP",
    title: "Xây dựng ứng dụng web quản lý ảnh tích hợp gom nhóm khuôn mặt không giám sát",
    info: [["Giảng viên hướng dẫn", "ThS. Nguyễn Văn A"], ["Sinh viên thực hiện", "Trần B – 26410001\nLê C – 26410002"], ["Lớp", "IE203.G12"]],
    bottom: "TP. Hồ Chí Minh, tháng 11 năm 2026",
  });

  r.toc();

  // Unnumbered opening section
  r.h1("MỞ ĐẦU");
  r.p("Điện thoại của mỗi người lưu hàng nghìn tấm ảnh, nhưng muốn tìm **tất cả ảnh có một người** vẫn phải lướt tay từng tấm. Đề tài xây dựng ứng dụng *chạy trên máy cá nhân* để tự gom ảnh theo người.");

  // Chapter written with the API
  r.chapter("Tổng quan đề tài");
  r.h2("Bối cảnh");
  r.p("Các dịch vụ như Google Photos đã có trang “Mọi người”, nhưng ảnh phải đưa lên cloud và người dùng không biết vì sao hệ thống xếp như vậy.");
  r.h2("Mục tiêu");
  r.numbered([
    "Gom đúng người: F1 ≥ 0,90 trên LFW.",
    "Chạy nhanh: ≤ 300 ms mỗi ảnh trên laptop có GPU.",
    ["Đo trên CPU: ≤ 1,5 s mỗi ảnh."],
    "Giải thích được kết quả gom nhóm.",
  ]);
  r.h3("Phạm vi");
  r.bullets(["Web quản lý ảnh chạy trên máy cá nhân.", "Không làm ứng dụng mobile và đồng bộ cloud."]);

  // A figure (any PNG/JPG/SVG path works; this one is generated so the example runs without assets)
  const diagram = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360">
      <rect width="1200" height="360" fill="#ffffff"/>
      ${["Tìm khuôn mặt", "Căn chỉnh", "Vân tay số", "Gom nhóm"].map((t, i) => `
        <rect x="${30 + i * 295}" y="110" width="250" height="140" rx="18" fill="${i === 3 ? "#1F3A5F" : "#E8EDF3"}"/>
        <text x="${155 + i * 295}" y="190" font-family="Arial" font-size="30" text-anchor="middle" fill="${i === 3 ? "#ffffff" : "#1F3A5F"}">${t}</text>
        ${i < 3 ? `<path d="M${285 + i * 295} 180 l36 0" stroke="#555" stroke-width="5" marker-end="url(#a)"/>` : ""}`).join("")}
      <defs><marker id="a" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#555"/></marker></defs>
    </svg>`)).png().toBuffer();
  await r.figure(diagram, { caption: "Quy trình xử lý bốn bước", width: 0.95 });

  r.table({
    caption: "So sánh các thuật toán gom cụm",
    header: ["Thuật toán", "Cần biết số cụm?", "Xử lý nhiễu", "F1 (LFW)"],
    rows: [["K-means", "Có", "Không", "0,81"], ["DBSCAN", "Không", "Có", "0,93"], ["HDBSCAN", "Không", "Có", "0,997"]],
    widths: [0.3, 0.25, 0.25, 0.2],
    align: ["left", "center", "center", "right"],
  });

  // Chapter written in Markdown (handy when the content already exists as .md)
  await r.markdown(`
# Phương pháp

## Phát hiện khuôn mặt

Mô hình **SCRFD** khoanh vùng từng khuôn mặt; năm điểm mốc dùng để căn chỉnh.

- Ảnh đầu vào được thu nhỏ về 640 px.
- Khuôn mặt nhỏ hơn 40 px bị bỏ qua.
  - Ngưỡng này chỉnh được trong cấu hình.

## Gom nhóm

> HDBSCAN tự tìm số cụm và để riêng các điểm không chắc chắn.

Bảng: Tham số gom nhóm
| Tham số | Giá trị | Ý nghĩa |
| --- | :---: | --- |
| min_cluster_size | 3 | Số ảnh tối thiểu của một người |
| metric | cosine | Khoảng cách giữa hai vân tay số |

# KẾT LUẬN {-}

Kết quả chạy thử cho thấy hướng tiếp cận khả thi.
`);

  r.references([
    "J. Deng, J. Guo, N. Xue, S. Zafeiriou, “ArcFace: Additive Angular Margin Loss for Deep Face Recognition,” *CVPR*, 2019.",
    "R. J. G. B. Campello, D. Moulavi, J. Sander, “Density-Based Clustering Based on Hierarchical Density Estimates,” *PAKDD*, 2013.",
  ]);

  await r.save(OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
