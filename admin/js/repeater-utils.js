// repeater-utils.js
// Hàm dùng chung cho các section có DANH SÁCH con lặp lại bên trong 1 document
// (VD: navItems của Header, items của Dịch vụ, plans của Bảng giá, steps của
// Quy trình, items của FAQ...). Vẫn theo đúng mô hình "1 section = 1 document"
// như hero-section.js — KHÔNG tạo collection Firestore riêng cho từng item.

// Sinh id ngắn, đủ dùng để React-key / data-index thay thế trong list nội bộ.
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Đổi chỗ 2 phần tử trong mảng (dir = -1 lên trên, +1 xuống dưới). Trả về mảng MỚI.
export function moveItem(arr, index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= arr.length) return arr;
  const copy = arr.slice();
  const tmp = copy[index];
  copy[index] = copy[newIndex];
  copy[newIndex] = tmp;
  return copy;
}

export function removeItem(arr, index) {
  return arr.filter((_, i) => i !== index);
}

// Textarea "mỗi dòng 1 mục" -> mảng string, bỏ dòng trống.
export function linesToArray(text) {
  return String(text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function arrayToLines(arr) {
  return (arr || []).join("\n");
}

// Gắn sự kiện click cho các nút điều khiển repeater đã render sẵn trong DOM
// (data-action="move-up|move-down|remove", data-index="N"), tránh phải bind
// từng nút thủ công ở mỗi file section.
// containerEl: phần tử cha chứa các item đã render.
// onAction(action, index): callback xử lý thay đổi state + render lại.
export function bindRepeaterControls(containerEl, onAction) {
  containerEl.querySelectorAll("[data-repeater-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-repeater-action");
      const index = Number(btn.getAttribute("data-index"));
      onAction(action, index);
    });
  });
}
