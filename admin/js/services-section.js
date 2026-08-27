// services-section.js
// Toàn bộ logic riêng cho màn hình "Nội dung > Dịch vụ": tiêu đề chung
// của section + danh sách 6 dịch vụ thật (icon Material Symbols — khớp
// với cách trang chủ render, KHÔNG dùng Tabler Icons nữa vì trang chủ
// không tải font đó), mỗi dịch vụ có màu accent riêng + link "Xem chi
// tiết", cùng nút "Xem tất cả dịch vụ". Cùng khuôn mẫu với hero-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const FIELD_LIMITS = { eyebrow: 80, title: 120, description: 200 };

// Màu accent cho phép chọn — khớp đúng bảng màu 6 card thật trên trang chủ.
export const ACCENT_COLORS = [
  { value: "primary", label: "Tím (primary)" },
  { value: "accent-blue", label: "Xanh dương" },
  { value: "orange-500", label: "Cam" },
  { value: "pink-500", label: "Hồng" },
  { value: "purple-600", label: "Tím than" },
  { value: "yellow-600", label: "Vàng" },
];

const DEFAULT_SERVICES = {
  eyebrow: "Dịch vụ của chúng tôi",
  title: "Giải pháp toàn diện giúp doanh nghiệp phát triển mạnh mẽ trên nền tảng số.",
  description: "",
  viewAllText: "Xem tất cả dịch vụ",
  viewAllLink: "/#services",
  items: [
    { id: uid(), icon: "language", color: "primary", title: "Thiết kế Website", description: "Website chuẩn SEO, tốc độ cao, giao diện hiện đại, tối ưu trải nghiệm người dùng trên mọi thiết bị.", link: "#" },
    { id: uid(), icon: "search", color: "accent-blue", title: "SEO Marketing", description: "Tối ưu hóa công cụ tìm kiếm, đưa từ khóa lên top Google bền vững, gia tăng lượng truy cập tự nhiên.", link: "#" },
    { id: uid(), icon: "ads_click", color: "orange-500", title: "Quảng cáo Google", description: "Chạy quảng cáo Google Ads tối ưu chi phí chuyển đổi, tiếp cận khách hàng tiềm năng ngay lập tức.", link: "#" },
    { id: uid(), icon: "share", color: "pink-500", title: "Social Media", description: "Quản trị và phát triển fanpage chuyên nghiệp, xây dựng cộng đồng và tương tác khách hàng hiệu quả.", link: "#" },
    { id: uid(), icon: "edit_note", color: "purple-600", title: "Content Marketing", description: "Sáng tạo nội dung chất lượng, thu hút khách hàng, kể câu chuyện thương hiệu đầy cảm xúc.", link: "#" },
    { id: uid(), icon: "star", color: "yellow-600", title: "Branding", description: "Xây dựng bộ nhận diện thương hiệu độc đáo, logo, ấn phẩm truyền thông chuyên nghiệp.", link: "#" },
  ],
};

let state = structuredClone(DEFAULT_SERVICES);
let originalState = structuredClone(DEFAULT_SERVICES);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initServicesPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("services");
    if (saved) {
      state = { ...structuredClone(DEFAULT_SERVICES), ...saved };
      if (!Array.isArray(state.items) || state.items.length === 0) {
        state.items = structuredClone(DEFAULT_SERVICES.items);
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Dịch vụ từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderItems();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("eyebrow-input").value = state.eyebrow;
  $("title-input").value = state.title;
  $("description-input").value = state.description;
  if ($("view-all-text-input")) $("view-all-text-input").value = state.viewAllText || "";
  if ($("view-all-link-input")) $("view-all-link-input").value = state.viewAllLink || "";
  updateAllCounters();
}

function readFormIntoState() {
  state.eyebrow = $("eyebrow-input").value;
  state.title = $("title-input").value;
  state.description = $("description-input").value;
  if ($("view-all-text-input")) state.viewAllText = $("view-all-text-input").value;
  if ($("view-all-link-input")) state.viewAllLink = $("view-all-link-input").value;
}

function updateCounter(inputId, counterId, field) {
  const max = FIELD_LIMITS[field];
  $(counterId).textContent = `${$(inputId).value.length}/${max}`;
}

function updateAllCounters() {
  updateCounter("eyebrow-input", "eyebrow-counter", "eyebrow");
  updateCounter("title-input", "title-counter", "title");
  updateCounter("description-input", "description-counter", "description");
}

// ---------- Repeater: items ----------

function colorOptionsHtml(selected) {
  return ACCENT_COLORS.map(
    (c) => `<option value="${c.value}" ${c.value === selected ? "selected" : ""}>${c.label}</option>`
  ).join("");
}

function renderItems() {
  const container = $("items-list");
  container.innerHTML = state.items
    .map(
      (item, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="flex-1 space-y-2">
        <div class="grid grid-cols-4 gap-2">
          <input type="text" class="item-icon-input px-3 py-2 rounded-lg border border-slate-200 text-xs col-span-1"
                 placeholder="language" value="${escapeHtml(item.icon)}" data-index="${index}" title="Tên icon Material Symbols" />
          <input type="text" class="item-title-input px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium col-span-2"
                 placeholder="Tên dịch vụ" value="${escapeHtml(item.title)}" data-index="${index}" />
          <select class="item-color-input px-2 py-2 rounded-lg border border-slate-200 text-xs col-span-1" data-index="${index}">
            ${colorOptionsHtml(item.color)}
          </select>
        </div>
        <textarea class="item-desc-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  rows="2" placeholder="Mô tả ngắn" data-index="${index}">${escapeHtml(item.description)}</textarea>
        <input type="text" class="item-link-input w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
               placeholder="Link 'Xem chi tiết' (VD: /services/thiet-ke-website)" value="${escapeHtml(item.link || "#")}" data-index="${index}" />
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.items.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".item-icon-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].icon = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".item-title-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].title = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".item-color-input").forEach((el) =>
    el.addEventListener("change", (e) => {
      state.items[Number(e.target.dataset.index)].color = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".item-desc-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].description = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".item-link-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].link = e.target.value;
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.items = moveItem(state.items, index, -1);
    if (action === "move-down") state.items = moveItem(state.items, index, 1);
    if (action === "remove") state.items = removeItem(state.items, index);
    renderItems();
    renderPreview();
  });
}

function addItem() {
  state.items.push({ id: uid(), icon: "star", color: "primary", title: "Dịch vụ mới", description: "", link: "#" });
  renderItems();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  $("preview-eyebrow").textContent = state.eyebrow;
  $("preview-title").textContent = state.title;
  $("preview-description").textContent = state.description;

  $("preview-items").innerHTML = state.items
    .map(
      (item) => `
      <div class="glass-card rounded-xl p-4">
        <span class="material-symbols-outlined text-xl text-${item.color || "primary"} mb-2">${escapeHtml(item.icon || "star")}</span>
        <p class="font-display font-medium text-sm text-slate-900">${escapeHtml(item.title)}</p>
        <p class="text-xs text-slate-500 mt-1">${escapeHtml(item.description)}</p>
      </div>`
    )
    .join("");

  if ($("preview-view-all")) {
    $("preview-view-all").textContent = state.viewAllText || "Xem tất cả dịch vụ";
  }
}

// ---------- Events ----------

function bindEvents() {
  ["eyebrow-input", "title-input", "description-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      updateAllCounters();
      renderPreview();
    });
  });

  if ($("view-all-text-input")) {
    $("view-all-text-input").addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
  }
  if ($("view-all-link-input")) {
    $("view-all-link-input").addEventListener("input", () => {
      readFormIntoState();
    });
  }

  $("btn-add-item").addEventListener("click", addItem);

  $("btn-save").addEventListener("click", handleSave);
  $("btn-save-bottom").addEventListener("click", handleSave);
  $("btn-undo").addEventListener("click", handleUndo);
  $("btn-cancel").addEventListener("click", () => {
    handleUndo();
    window.location.href = "../index.html";
  });
}

async function handleSave() {
  readFormIntoState();
  const statusEl = $("save-status");
  statusEl.textContent = "Đang lưu...";
  try {
    await saveSection("services", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderItems();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
