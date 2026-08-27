// cta-section.js
// Toàn bộ logic riêng cho màn hình "Website > CTA (Kêu gọi hành động)":
// khối tím lớn "Sẵn sàng bứt phá doanh số?" giữa trang chủ, gồm tiêu đề,
// mô tả, 2 nút (nút chính nền trắng + nút phụ viền trắng). Trước đây
// phần này hoàn toàn KHÔNG có màn hình quản trị. Cùng khuôn mẫu với
// hero-section.js.

import { getSection, saveSection } from "./firestore-service.js";

const FIELD_LIMITS = { title: 120, description: 220 };

const DEFAULT_CTA = {
  title: "Sẵn sàng bứt phá doanh số?",
  description:
    "Liên hệ ngay với chúng tôi để nhận tư vấn chiến lược Digital Marketing miễn phí cho doanh nghiệp của bạn.",
  primaryButton: { text: "Bắt đầu ngay", link: "https://zalo.me/0776114101" },
  secondaryButton: { text: "Liên hệ tư vấn", link: "https://www.facebook.com/neowavemarketing" },
};

let state = structuredClone(DEFAULT_CTA);
let originalState = structuredClone(DEFAULT_CTA);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initCtaPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("cta");
    if (saved) {
      state = { ...structuredClone(DEFAULT_CTA), ...saved };
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu CTA từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("title-input").value = state.title;
  $("description-input").value = state.description;
  $("primary-text-input").value = state.primaryButton.text;
  $("primary-link-input").value = state.primaryButton.link;
  $("secondary-text-input").value = state.secondaryButton.text;
  $("secondary-link-input").value = state.secondaryButton.link;
  updateAllCounters();
}

function readFormIntoState() {
  state.title = $("title-input").value;
  state.description = $("description-input").value;
  state.primaryButton = { text: $("primary-text-input").value, link: $("primary-link-input").value };
  state.secondaryButton = { text: $("secondary-text-input").value, link: $("secondary-link-input").value };
}

function updateCounter(inputId, counterId, field) {
  const max = FIELD_LIMITS[field];
  $(counterId).textContent = `${$(inputId).value.length}/${max}`;
}

function updateAllCounters() {
  updateCounter("title-input", "title-counter", "title");
  updateCounter("description-input", "description-counter", "description");
}

function renderPreview() {
  $("preview-title").textContent = state.title;
  $("preview-description").textContent = state.description;
  $("preview-primary-btn").textContent = state.primaryButton.text || "Nút chính";
  $("preview-secondary-btn").textContent = state.secondaryButton.text || "Nút phụ";
}

function bindEvents() {
  ["title-input", "description-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      updateAllCounters();
      renderPreview();
    });
  });

  ["primary-text-input", "primary-link-input", "secondary-text-input", "secondary-link-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
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
    await saveSection("cta", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
