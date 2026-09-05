// contact-widget-section.js
// Toàn bộ logic riêng cho màn hình "Nút liên hệ nổi" (floating contact stack
// góc dưới phải trang chủ). Cùng khuôn mẫu với footer-section.js:
// 1 section = 1 document (sections/contactWidget) + repeater CRUD cho danh
// sách nút (thêm/xoá/sắp xếp/bật-tắt từng nút) dùng chung repeater-utils.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const DEFAULT_STATE = {
  enabled: true,
  autoOpenOnLoad: true,
  autoOpenOnce: true,
  autoOpenDelayMs: 1500,
  buttons: [
    { id: uid(), label: "Gọi ngay", link: "tel:+84776114101", iconType: "material", iconValue: "call", bgColor: "#10b981", enabled: true },
    { id: uid(), label: "Zalo", link: "https://zalo.me/0776114101", iconType: "text", iconValue: "Zalo", bgColor: "#0068FF", enabled: true },
    { id: uid(), label: "Messenger", link: "https://m.me/neowavemarketing", iconType: "fa", iconValue: "fa-brands fa-facebook-messenger", bgColor: "linear-gradient(135deg,#00B2FF 0%,#006AFF 50%,#B620E0 100%)", enabled: true },
    { id: uid(), label: "Email", link: "mailto:quoctung.work@gmail.com", iconType: "material", iconValue: "mail", bgColor: "linear-gradient(135deg,#fb923c,#ef4444)", enabled: true },
  ],
};

let state = structuredClone(DEFAULT_STATE);
let originalState = structuredClone(DEFAULT_STATE);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initContactWidgetPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("contactWidget");
    if (saved) {
      state = { ...structuredClone(DEFAULT_STATE), ...saved };
      if (!Array.isArray(state.buttons) || state.buttons.length === 0) {
        state.buttons = structuredClone(DEFAULT_STATE.buttons);
      }
    }
  } catch (err) {
    console.warn("Không tải được cấu hình Nút liên hệ nổi, dùng mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderButtons();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("enabled-input").checked = state.enabled !== false;
  $("auto-open-input").checked = !!state.autoOpenOnLoad;
  $("auto-open-once-input").checked = !!state.autoOpenOnce;
  $("auto-open-delay-input").value = state.autoOpenDelayMs ?? 1500;
}

function readFormIntoState() {
  state.enabled = $("enabled-input").checked;
  state.autoOpenOnLoad = $("auto-open-input").checked;
  state.autoOpenOnce = $("auto-open-once-input").checked;
  state.autoOpenDelayMs = Number($("auto-open-delay-input").value) || 0;
}

// ---------- Icon preview dùng chung cho form + preview (khớp render công khai) ----------

function iconInnerHtml(btn) {
  const type = btn.iconType || "material";
  const value = btn.iconValue || "";
  if (type === "fa") return `<i class="${escapeHtml(value)} text-[16px]"></i>`;
  if (type === "text") return escapeHtml(value || btn.label || "");
  return `<span class="material-symbols-outlined text-[18px]">${escapeHtml(value || "link")}</span>`;
}

// ---------- Repeater: buttons ----------

function renderButtons() {
  const container = $("buttons-list");
  container.innerHTML = state.buttons
    .map(
      (btn, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="flex-1 grid grid-cols-2 gap-2">
        <input type="text" class="btn-label-input px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Nhãn (VD: Gọi ngay)" value="${escapeHtml(btn.label)}" data-index="${index}" />
        <input type="text" class="btn-link-input px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Link (tel:, https://zalo.me/..., mailto:...)" value="${escapeHtml(btn.link)}" data-index="${index}" />

        <select class="btn-icontype-input px-3 py-2 rounded-lg border border-slate-200 text-sm" data-index="${index}">
          <option value="material" ${btn.iconType === "material" ? "selected" : ""}>Icon Material Symbols</option>
          <option value="fa" ${btn.iconType === "fa" ? "selected" : ""}>Icon Font Awesome</option>
          <option value="text" ${btn.iconType === "text" ? "selected" : ""}>Chữ ngắn (VD: Zalo)</option>
        </select>
        <input type="text" class="btn-iconvalue-input px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="VD: call / fa-brands fa-facebook-messenger / Zalo" value="${escapeHtml(btn.iconValue)}" data-index="${index}" />

        <input type="text" class="btn-color-input col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Màu nền (mã hex #10b981 hoặc gradient CSS)" value="${escapeHtml(btn.bgColor)}" data-index="${index}" />

        <label class="col-span-2 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" class="btn-enabled-input" data-index="${index}" ${btn.enabled !== false ? "checked" : ""} />
          Hiển thị nút này trên trang chủ
        </label>
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.buttons.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  const bindField = (selector, field, parse = (v) => v) => {
    container.querySelectorAll(selector).forEach((el) => {
      el.addEventListener(el.type === "checkbox" ? "change" : "input", (e) => {
        const idx = Number(e.target.dataset.index);
        state.buttons[idx][field] = parse(e.target.type === "checkbox" ? e.target.checked : e.target.value);
        renderPreview();
      });
    });
  };

  bindField(".btn-label-input", "label");
  bindField(".btn-link-input", "link");
  bindField(".btn-icontype-input", "iconType");
  bindField(".btn-iconvalue-input", "iconValue");
  bindField(".btn-color-input", "bgColor");
  bindField(".btn-enabled-input", "enabled");

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.buttons = moveItem(state.buttons, index, -1);
    if (action === "move-down") state.buttons = moveItem(state.buttons, index, 1);
    if (action === "remove") state.buttons = removeItem(state.buttons, index);
    renderButtons();
    renderPreview();
  });
}

function addButton() {
  state.buttons.push({
    id: uid(),
    label: "Nút mới",
    link: "#",
    iconType: "material",
    iconValue: "link",
    bgColor: "#6812ca",
    enabled: true,
  });
  renderButtons();
  renderPreview();
}

// ---------- Preview (mô phỏng đúng .contact-pill ngoài trang chủ) ----------

function renderPreview() {
  const wrap = $("preview-buttons");
  const enabledButtons = state.buttons.filter((b) => b.enabled !== false);
  wrap.innerHTML = enabledButtons
    .map(
      (btn) => `
      <div class="contact-pill">
        <span class="contact-pill__icon" style="background:${escapeHtml(btn.bgColor || "#6812ca")};${btn.iconType === "text" ? "border-radius:12px;font-weight:700;font-size:11px;" : ""}">
          ${iconInnerHtml(btn)}
        </span>
        <span>${escapeHtml(btn.label || "")}</span>
      </div>`
    )
    .join("");

  $("preview-status").textContent = state.enabled === false
    ? "Widget đang TẮT — sẽ không hiển thị trên trang chủ."
    : state.autoOpenOnLoad
      ? `Sẽ tự động mở sau ${state.autoOpenDelayMs || 0}ms khi khách vào trang${state.autoOpenOnce ? " (chỉ 1 lần/phiên truy cập)" : ""}.`
      : "Chỉ mở khi khách bấm vào nút tròn (không tự mở).";
}

// ---------- Events ----------

function bindEvents() {
  ["enabled-input", "auto-open-input", "auto-open-once-input", "auto-open-delay-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
  });

  $("btn-add-button").addEventListener("click", addButton);

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
    await saveSection("contactWidget", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderButtons();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
