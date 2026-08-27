// hero-section.js
// Toàn bộ logic riêng cho màn hình "Trang chủ > Hero Section":
// nạp dữ liệu, đếm ký tự, cập nhật preview trực tiếp, upload ảnh,
// lưu / làm lại / hủy bỏ. File này KHÔNG chứa HTML — chỉ thao tác
// lên các phần tử đã có sẵn trong pages/hero.html theo id.

import { getSection, saveSection } from "./firestore-service.js";
import { uploadImageToFirestore, getImageById } from "./image-firestore-service.js";

const DEFAULT_HERO = {
  eyebrow: "ĐANG KHÔNG NGỪNG ĐỔI MỚI AI",
  titleMain: "Thiết Kế Website\nChuẩn SEO & Giải Pháp Digital Marketing",
  titleHighlight: "Chuẩn SEO",
  description:
    "Nâng tầm thương hiệu của bạn với các giải pháp công nghệ tiên tiến và chiến lược marketing hiệu quả. Chúng tôi biến ý tưởng thành hiện thực số.",
  primaryButton: { text: "Tư vấn miễn phí", link: "/contact" },
  secondaryButton: { text: "Xem dự án", link: "/projects" },
  trustBadges: ["Support 24/7", "Tối ưu chi phí", "Chuẩn SEO Google"],
  floatingStat: { label: "Tăng trưởng", value: "+128% Traffic" },
  image: { url: "", mediaId: "" },
};

const FIELD_LIMITS = { eyebrow: 80, titleMain: 120, description: 200 };

let state = structuredClone(DEFAULT_HERO);
let originalState = structuredClone(DEFAULT_HERO);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initHeroPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("hero");
    if (saved) {
      state = { ...structuredClone(DEFAULT_HERO), ...saved };
      // sections/hero chỉ lưu { mediaId }, KHÔNG lưu base64 để tránh nhân đôi
      // dữ liệu nặng ở 2 nơi. Ở đây mới "trỏ" sang media_base64 để lấy ảnh
      // thật, gán tạm vào state.image.url (chỉ dùng để hiển thị, không lưu lại).
      if (state.image?.mediaId) {
        try {
          const dataUrl = await getImageById(state.image.mediaId);
          state.image.url = dataUrl || "";
        } catch (err) {
          console.warn("Không tải được ảnh Hero từ media_base64:", err.message);
          state.image.url = "";
        }
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Hero từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("eyebrow-input").value = state.eyebrow;
  $("title-input").value = state.titleMain;
  $("title-highlight-input").value = state.titleHighlight;
  $("description-input").value = state.description;
  $("primary-text-input").value = state.primaryButton.text;
  $("primary-link-input").value = state.primaryButton.link;
  $("secondary-text-input").value = state.secondaryButton.text;
  $("secondary-link-input").value = state.secondaryButton.link;
  $("trust-badges-input").value = state.trustBadges.join(", ");
  $("stat-label-input").value = state.floatingStat.label;
  $("stat-value-input").value = state.floatingStat.value;
  updateAllCounters();
}

function readFormIntoState() {
  state.eyebrow = $("eyebrow-input").value;
  state.titleMain = $("title-input").value;
  state.titleHighlight = $("title-highlight-input").value;
  state.description = $("description-input").value;
  state.primaryButton = { text: $("primary-text-input").value, link: $("primary-link-input").value };
  state.secondaryButton = { text: $("secondary-text-input").value, link: $("secondary-link-input").value };
  state.trustBadges = $("trust-badges-input").value.split(",").map((s) => s.trim()).filter(Boolean);
  state.floatingStat = { label: $("stat-label-input").value, value: $("stat-value-input").value };
}

function updateCounter(inputId, counterId) {
  const field = { "eyebrow-input": "eyebrow", "title-input": "titleMain", "description-input": "description" }[inputId];
  const max = FIELD_LIMITS[field];
  const value = $(inputId).value;
  $(counterId).textContent = `${value.length}/${max}`;
}

function updateAllCounters() {
  updateCounter("eyebrow-input", "eyebrow-counter");
  updateCounter("title-input", "title-counter");
  updateCounter("description-input", "description-counter");
}

// Bọc phần titleHighlight bằng span gradient giống hiệu ứng .text-gradient-clip trên site thật
function highlightTitle(titleMain, highlight) {
  const escaped = titleMain
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
  if (!highlight) return escaped;
  const safeHighlight = escapeHtml(highlight);
  return escaped.replace(safeHighlight, `<span class="text-gradient-clip">${safeHighlight}</span>`);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderPreview() {
  $("preview-eyebrow").textContent = state.eyebrow;
  $("preview-title").innerHTML = highlightTitle(state.titleMain, state.titleHighlight);
  $("preview-description").textContent = state.description;
  $("preview-primary-btn").textContent = state.primaryButton.text || "Nút chính";
  $("preview-secondary-btn").textContent = state.secondaryButton.text || "Nút phụ";
  $("preview-stat-label").textContent = state.floatingStat.label;
  $("preview-stat-value").textContent = state.floatingStat.value;

  const badgesEl = $("preview-badges");
  badgesEl.innerHTML = state.trustBadges
    .map((b) => `<span class="flex items-center gap-1"><i class="ti ti-check text-primary"></i>${escapeHtml(b)}</span>`)
    .join("");

  const imgEl = $("preview-image");
  if (state.image?.url) {
    imgEl.src = state.image.url;
    imgEl.classList.remove("hidden");
  } else {
    imgEl.classList.add("hidden");
  }
}

function bindEvents() {
  ["eyebrow-input", "title-input", "description-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      updateAllCounters();
      renderPreview();
    });
  });

  ["title-highlight-input", "primary-text-input", "primary-link-input",
   "secondary-text-input", "secondary-link-input", "trust-badges-input",
   "stat-label-input", "stat-value-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
  });

  $("image-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $("upload-status");
    try {
      const { url, mediaId } = await uploadImageToFirestore(file, (msg) => (statusEl.textContent = msg));
      state.image = { url, mediaId };
      renderPreview();
      statusEl.textContent = "Đã lưu ảnh vào Firestore.";
    } catch (err) {
      statusEl.textContent = err.message;
    }
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
    // Chỉ lưu { mediaId } vào sections/hero — KHÔNG lưu base64 (url) vào đây,
    // vì ảnh đã có sẵn 1 bản đầy đủ trong collection media_base64 rồi.
    // Việc này giữ document "sections/hero" nhỏ gọn, tránh vượt giới hạn
    // 1MB/document của Firestore khi cộng dồn với các field khác.
    const payload = {
      ...state,
      image: { mediaId: state.image?.mediaId || "" },
    };
    await saveSection("hero", payload, currentUser);
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