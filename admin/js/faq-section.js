// faq-section.js
// Toàn bộ logic riêng cho màn hình "Nội dung > FAQ": tiêu đề chung của
// section + danh sách câu hỏi/trả lời, xem trước dạng accordion.
// Cùng khuôn mẫu với hero-section.js / services-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const FIELD_LIMITS = { eyebrow: 80, title: 120, description: 200 };

const DEFAULT_FAQ = {
  eyebrow: "CÂU HỎI THƯỜNG GẶP",
  title: "Giải đáp những thắc mắc phổ biến",
  description: "Chưa tìm thấy câu trả lời bạn cần? Liên hệ với chúng tôi để được hỗ trợ nhanh nhất.",
  items: [
    { id: uid(), question: "Thời gian hoàn thành một website mất bao lâu?", answer: "Trung bình từ 2-4 tuần tuỳ theo độ phức tạp và số lượng trang." },
    { id: uid(), question: "Tôi có thể tự chỉnh sửa nội dung sau khi bàn giao không?", answer: "Có, chúng tôi bàn giao kèm CMS quản trị dễ sử dụng, không cần biết lập trình." },
    { id: uid(), question: "Có hỗ trợ bảo trì sau khi hoàn thành không?", answer: "Có, mỗi gói dịch vụ đều bao gồm thời gian hỗ trợ miễn phí tương ứng." },
  ],
};

let state = structuredClone(DEFAULT_FAQ);
let originalState = structuredClone(DEFAULT_FAQ);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initFaqPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("faq");
    if (saved) {
      state = { ...structuredClone(DEFAULT_FAQ), ...saved };
      if (!Array.isArray(state.items) || state.items.length === 0) {
        state.items = structuredClone(DEFAULT_FAQ.items);
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu FAQ từ Firestore, dùng dữ liệu mặc định:", err.message);
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
  updateAllCounters();
}

function readFormIntoState() {
  state.eyebrow = $("eyebrow-input").value;
  state.title = $("title-input").value;
  state.description = $("description-input").value;
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

function renderItems() {
  const container = $("items-list");
  container.innerHTML = state.items
    .map(
      (item, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="flex-1 space-y-2">
        <input type="text" class="item-question-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium"
               placeholder="Câu hỏi" value="${escapeHtml(item.question)}" data-index="${index}" />
        <textarea class="item-answer-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  rows="2" placeholder="Câu trả lời" data-index="${index}">${escapeHtml(item.answer)}</textarea>
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.items.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".item-question-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].question = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".item-answer-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.items[Number(e.target.dataset.index)].answer = e.target.value;
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
  state.items.push({ id: uid(), question: "Câu hỏi mới", answer: "" });
  renderItems();
  renderPreview();
}

// ---------- Preview (accordion, mở mục đầu tiên) ----------

function renderPreview() {
  $("preview-eyebrow").textContent = state.eyebrow;
  $("preview-title").textContent = state.title;
  $("preview-description").textContent = state.description;

  $("preview-items").innerHTML = state.items
    .map(
      (item, index) => `
      <div class="glass-card rounded-xl p-4">
        <p class="font-display font-medium text-sm text-slate-900 flex items-center justify-between gap-2">
          ${escapeHtml(item.question)}
          <i class="ti ${index === 0 ? "ti-chevron-up" : "ti-chevron-down"} text-slate-400 shrink-0"></i>
        </p>
        ${index === 0 ? `<p class="text-xs text-slate-500 mt-2">${escapeHtml(item.answer)}</p>` : ""}
      </div>`
    )
    .join("");
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
    await saveSection("faq", state, currentUser);
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
