// stats-section.js
// Toàn bộ logic riêng cho màn hình "Website > Thống kê (Stats)": danh
// sách các chỉ số nổi bật hiển thị ngay dưới section Dịch vụ trên trang
// chủ (500+ Dự án, 98% Khách hàng hài lòng, 3+ Năm kinh nghiệm, 24/7 Hỗ
// trợ). Trước đây phần này hoàn toàn KHÔNG có màn hình quản trị. Cùng
// khuôn mẫu với hero-section.js / services-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const DEFAULT_STATS = {
  items: [
    { id: uid(), value: "500+", label: "Dự án hoàn thành" },
    { id: uid(), value: "98%", label: "Khách hàng hài lòng" },
    { id: uid(), value: "3+", label: "Năm kinh nghiệm" },
    { id: uid(), value: "24/7", label: "Hỗ trợ kỹ thuật" },
  ],
};

let state = structuredClone(DEFAULT_STATS);
let originalState = structuredClone(DEFAULT_STATS);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initStatsPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("stats");
    if (saved) {
      state = { ...structuredClone(DEFAULT_STATS), ...saved };
      if (!Array.isArray(state.items) || state.items.length === 0) {
        state.items = structuredClone(DEFAULT_STATS.items);
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Thống kê từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  renderItems();
  renderPreview();
  bindEvents();
}

// ---------- Repeater: items ----------

function renderItems() {
  const container = $("stats-list");
  container.innerHTML = state.items
    .map(
      (item, index) => `
    <div class="repeater-row" data-index="${index}">
      <div class="grid grid-cols-2 gap-2 flex-1">
        <input type="text" class="stat-value-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
               placeholder="500+" value="${escapeHtml(item.value)}" data-index="${index}" />
        <input type="text" class="stat-label-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Dự án hoàn thành" value="${escapeHtml(item.label)}" data-index="${index}" />
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.items.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".stat-value-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].value = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".stat-label-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].label = e.target.value;
      renderPreview();
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
  state.items.push({ id: uid(), value: "0", label: "Chỉ số mới" });
  renderItems();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  $("preview-items").innerHTML = state.items
    .map(
      (item) => `
      <div class="text-center">
        <p class="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent-blue">${escapeHtml(item.value)}</p>
        <p class="text-[10px] text-slate-500 mt-1">${escapeHtml(item.label)}</p>
      </div>`
    )
    .join("");
}

// ---------- Events ----------

function bindEvents() {
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
  const statusEl = $("save-status");
  statusEl.textContent = "Đang lưu...";
  try {
    await saveSection("stats", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  renderItems();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
