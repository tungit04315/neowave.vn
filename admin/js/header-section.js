// header-section.js
// Toàn bộ logic riêng cho màn hình "Website > Header":
// nạp dữ liệu, quản lý danh sách menu điều hướng (thêm/xoá/sắp xếp),
// upload logo (lưu base64 vào Firestore, cùng cơ chế với Hero — KHÔNG
// dùng Cloud Storage/storage-service.js nữa để tránh lỗi CORS), cập nhật
// preview trực tiếp, lưu / làm lại / hủy bỏ.
// File này KHÔNG chứa HTML — chỉ thao tác lên các phần tử có sẵn
// trong pages/header.html theo id, cùng khuôn mẫu với hero-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uploadImageToFirestore, getImageById } from "./image-firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

// Khớp đúng header thật trên index.html: 6 mục menu tiếng Anh (Home, Services,
// Projects, Pricing, Blog, Contact) + nút CTA "Get Started" trỏ sang Zalo.
const DEFAULT_HEADER = {
  logo: { type: "image", url: "", mediaId: "" },
  navItems: [
    { id: uid(), label: "Home", link: "/" },
    { id: uid(), label: "Services", link: "/#services" },
    { id: uid(), label: "Projects", link: "/#projects" },
    { id: uid(), label: "Pricing", link: "/#pricing" },
    { id: uid(), label: "Blog", link: "/#blog" },
    { id: uid(), label: "Contact", link: "/#contact" },
  ],
  ctaButton: { text: "Get Started", link: "https://zalo.me/0776114101", enabled: true },
  sticky: true,
};

let state = structuredClone(DEFAULT_HEADER);
let originalState = structuredClone(DEFAULT_HEADER);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initHeaderPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("header");
    if (saved) {
      state = { ...structuredClone(DEFAULT_HEADER), ...saved };
      if (!Array.isArray(state.navItems) || state.navItems.length === 0) {
        state.navItems = structuredClone(DEFAULT_HEADER.navItems);
      }
      // sections/header chỉ lưu { mediaId }, giống hero-section.js — nạp lại
      // ảnh thật từ collection media_base64 để hiển thị preview.
      if (state.logo?.type === "image" && state.logo?.mediaId) {
        try {
          const dataUrl = await getImageById(state.logo.mediaId);
          state.logo.url = dataUrl || "";
        } catch (err) {
          console.warn("Không tải được logo từ media_base64:", err.message);
          state.logo.url = "";
        }
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Header từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderNavItems();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("logo-text-input").value = state.logo.text || "NEO WAVE";
  $("cta-text-input").value = state.ctaButton.text;
  $("cta-link-input").value = state.ctaButton.link;
  $("cta-enabled-input").checked = !!state.ctaButton.enabled;
  $("sticky-input").checked = !!state.sticky;
}

function readFormIntoState() {
  state.logo.text = $("logo-text-input").value;
  state.ctaButton = {
    text: $("cta-text-input").value,
    link: $("cta-link-input").value,
    enabled: $("cta-enabled-input").checked,
  };
  state.sticky = $("sticky-input").checked;
}

// ---------- Repeater: navItems ----------

function renderNavItems() {
  const container = $("nav-items-list");
  container.innerHTML = state.navItems
    .map(
      (item, index) => `
    <div class="repeater-row" data-index="${index}">
      <div class="grid grid-cols-2 gap-2 flex-1">
        <input type="text" class="nav-label-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Nhãn menu" value="${escapeHtml(item.label)}" data-index="${index}" />
        <input type="text" class="nav-link-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Đường dẫn (VD: /#services)" value="${escapeHtml(item.link)}" data-index="${index}" />
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.navItems.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".nav-label-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.navItems[Number(e.target.dataset.index)].label = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".nav-link-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.navItems[Number(e.target.dataset.index)].link = e.target.value;
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.navItems = moveItem(state.navItems, index, -1);
    if (action === "move-down") state.navItems = moveItem(state.navItems, index, 1);
    if (action === "remove") state.navItems = removeItem(state.navItems, index);
    renderNavItems();
    renderPreview();
  });
}

function addNavItem() {
  state.navItems.push({ id: uid(), label: "Mục menu mới", link: "/" });
  renderNavItems();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  const logoTextEl = $("preview-logo-text");
  const logoImgEl = $("preview-logo-image");
  if (state.logo.type === "image" && state.logo.url) {
    logoImgEl.src = state.logo.url;
    logoImgEl.classList.remove("hidden");
    logoTextEl.classList.add("hidden");
  } else {
    logoImgEl.classList.add("hidden");
    logoTextEl.classList.remove("hidden");
    logoTextEl.textContent = state.logo.text || "NEO WAVE";
  }

  $("preview-nav").innerHTML = state.navItems
    .map((item) => `<span class="px-2">${escapeHtml(item.label)}</span>`)
    .join("");

  const ctaEl = $("preview-cta");
  if (state.ctaButton.enabled) {
    ctaEl.textContent = state.ctaButton.text || "Nút CTA";
    ctaEl.classList.remove("hidden");
  } else {
    ctaEl.classList.add("hidden");
  }

  $("preview-sticky-note").textContent = state.sticky
    ? "Header sẽ dính (sticky) khi cuộn trang."
    : "Header cuộn theo trang bình thường.";
}

// ---------- Events ----------

function bindEvents() {
  ["logo-text-input", "cta-text-input", "cta-link-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
  });

  ["cta-enabled-input", "sticky-input"].forEach((id) => {
    $(id).addEventListener("change", () => {
      readFormIntoState();
      renderPreview();
    });
  });

  $("btn-add-nav-item").addEventListener("click", addNavItem);

  $("logo-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $("logo-upload-status");
    try {
      // Dùng image-firestore-service (base64 vào Firestore) thay vì
      // storage-service (Cloud Storage) — khớp với cách hero-section.js
      // đã dùng, tránh lỗi CORS khi chưa cấu hình Storage Rules.
      const { url, mediaId } = await uploadImageToFirestore(file, (msg) => (statusEl.textContent = msg));
      state.logo = { ...state.logo, type: "image", url, mediaId };
      renderPreview();
      statusEl.textContent = "Đã lưu logo vào Firestore.";
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  $("btn-use-text-logo").addEventListener("click", () => {
    state.logo.type = "text";
    renderPreview();
  });

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
    // Chỉ lưu { type, mediaId, text } vào sections/header — KHÔNG lưu base64
    // (url) vào đây, ảnh thật đã nằm trong collection media_base64 rồi.
    const payload = {
      ...state,
      logo: { type: state.logo.type, mediaId: state.logo.mediaId || "", text: state.logo.text || "" },
    };
    await saveSection("header", payload, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderNavItems();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
