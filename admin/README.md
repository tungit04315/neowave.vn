# NEO WAVE — Admin CMS (Demo)

CMS quản trị nội dung cho website NEO WAVE, xây bằng **HTML/CSS/JS thuần + Firebase**, theo đúng kiến trúc đã phân tích (xem `bao-cao-kien-truc-cms-neowave.md`).

## Cấu trúc file JS (đã tách theo chức năng)

| File | Vai trò |
|---|---|
| `js/tailwind-config.js` | Design token dùng chung, đồng bộ với `app.js` của site public |
| `js/firebase-config.js` | Khởi tạo Firebase App, Auth, Firestore, Storage + bật offline persistence |
| `js/auth-guard.js` | Đăng nhập/đăng xuất, chặn truy cập trang khi chưa đăng nhập, kiểm tra role |
| `js/firestore-service.js` | Đọc/ghi dữ liệu section dùng chung cho mọi màn hình + ghi nhật ký hoạt động |
| `js/storage-service.js` | Nén ảnh, tính hash SHA-256, upload Cloud Storage, khử trùng lặp |
| `js/sidebar.js` | Render sidebar menu dùng chung cho mọi trang admin |
| `js/hero-section.js` | Logic riêng của màn hình Hero Section: nạp dữ liệu, đếm ký tự, preview realtime, lưu/undo |

## Trang đã hoàn chỉnh

**Nhóm "1 section = 1 document"** (đọc/ghi `sections/{id}`, theo đúng khuôn mẫu Hero):

| Trang | File | Firestore doc |
|---|---|---|
| Đăng nhập | `login.html` | — |
| Dashboard | `index.html` | — |
| Trang chủ (Hero) | `pages/hero.html` + `js/hero-section.js` | `sections/hero` |
| Header | `pages/header.html` + `js/header-section.js` | `sections/header` |
| Footer | `pages/footer.html` + `js/footer-section.js` | `sections/footer` |
| Dịch vụ | `pages/services.html` + `js/services-section.js` | `sections/services` |
| Bảng giá | `pages/pricing.html` + `js/pricing-section.js` | `sections/pricing` |
| Quy trình | `pages/workflow.html` + `js/workflow-section.js` | `sections/workflow` |
| FAQ | `pages/faq.html` + `js/faq-section.js` | `sections/faq` |

Các trang mới đều dùng chung `js/repeater-utils.js` (thêm/xoá/sắp xếp danh sách con — menu, dịch vụ, gói giá, bước quy trình, câu hỏi...) và style repeater trong `css/admin.css`.

**Chưa dựng — thuộc nhóm "danh sách nhiều bản ghi" (CRUD collection riêng, không phải 1 document như trên):**

Dự án, Blog, Đánh giá khách hàng, Media Library, Khách hàng liên hệ, Form liên hệ, Người dùng, Nhật ký hoạt động, Cài đặt — các trang này cần mô hình dữ liệu khác (collection Firestore riêng + màn hình danh sách/list + trang chi tiết/edit), sẽ làm ở giai đoạn tiếp theo.

## Cách chạy thử

1. **Cần chạy qua HTTP server** (không mở trực tiếp file://, vì dùng ES module):
   ```bash
   cd admin-cms
   npx serve .
   # hoặc: python3 -m http.server 8080
   ```
2. Mở `http://localhost:PORT/login.html`.
3. **Trước khi đăng nhập được thật**, cần:
   - Tạo project Firebase thật, bật Authentication (Email/Password), Firestore, Storage.
   - Thay 6 giá trị demo trong `js/firebase-config.js` bằng config thật.
   - Tạo 1 tài khoản Admin trong Firebase Console → Authentication.
   - (Tuỳ chọn) Gán custom claim `role: "super_admin"` cho tài khoản đó qua Cloud Function hoặc Admin SDK, nếu không sẽ mặc định là `editor`.
   - Áp dụng Firestore Rules & Storage Rules mẫu trong báo cáo kiến trúc (mục 8).

## Ghi chú

- Với cấu hình demo (`DEMO_API_KEY`...), trang sẽ hiển thị giao diện đầy đủ nhưng **không đăng nhập/lưu được thật** vì chưa trỏ tới project Firebase có thật — cần hoàn thành bước 3 ở trên.
- File `firestore-image-chunking.js` (đã gửi trước đó) là module riêng cho trường hợp đặc biệt cần lưu ảnh ngay trong Firestore (offline-sync không dùng Storage) — không được dùng trong luồng mặc định của `storage-service.js`.
