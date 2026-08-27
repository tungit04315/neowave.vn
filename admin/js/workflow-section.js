// workflow-section.js
// Toàn bộ logic riêng cho màn hình "Nội dung > Quy trình": tiêu đề chung
// của section + danh sách 5 bước làm việc thật (icon Material Symbols —
// khớp cách trang chủ render), đánh số thứ tự tự động theo vị trí trong
// mảng. Cùng khuôn mẫu với hero-section.js / services-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const FIELD_LIMITS = { eyebrow: 80, title: 120, description: 200 };

const DEFAULT_WORKFLOW = {
  eyebrow: "QUY TRÌNH CỦA CHÚNG TÔI",
  title: "Từ ý tưởng đến khi ra mắt sản phẩm",
  description: "",
  steps: [
    { id: uid(), icon: "lightbulb", title: "1. Consulting", description: "Khám phá & xây dựng chiến lược." },
    { id: uid(), icon: "brush", title: "2. UI/UX Design", description: "Thiết kế khung sườn & tạo mẫu trực quan." },
    { id: uid(), icon: "code", title: "3. Development", description: "Lập trình sạch & tích hợp CMS." },
    { id: uid(), icon: "bug_report", title: "4. Testing", description: "Kiểm thử chất lượng & xác thực trên nhiều thiết bị." },
    { id: uid(), icon: "rocket", title: "5. Launch", description: "Hỗ trợ triển khai & sau khi ra mắt." },
  ],
};

let state = structuredClone(DEFAULT_WORKFLOW);
let originalState = structuredClone(DEFAULT_WORKFLOW);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initWorkflowPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("workflow");
    if (saved) {
      state = { ...structuredClone(DEFAULT_WORKFLOW), ...saved };
      if (!Array.isArray(state.steps) || state.steps.length === 0) {
        state.steps = structuredClone(DEFAULT_WORKFLOW.steps);
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Quy trình từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderSteps();
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

// ---------- Repeater: steps ----------

function renderSteps() {
  const container = $("steps-list");
  container.innerHTML = state.steps
    .map(
      (step, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-display font-bold flex items-center justify-center shrink-0 mt-1">${index + 1}</div>
      <div class="flex-1 space-y-2">
        <div class="grid grid-cols-3 gap-2">
          <input type="text" class="step-icon-input px-3 py-2 rounded-lg border border-slate-200 text-xs col-span-1"
                 placeholder="lightbulb" value="${escapeHtml(step.icon)}" data-index="${index}" title="Tên icon Material Symbols" />
          <input type="text" class="step-title-input px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium col-span-2"
                 placeholder="Tên bước" value="${escapeHtml(step.title)}" data-index="${index}" />
        </div>
        <textarea class="step-desc-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  rows="2" placeholder="Mô tả bước" data-index="${index}">${escapeHtml(step.description)}</textarea>
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.steps.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".step-icon-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.steps[Number(e.target.dataset.index)].icon = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".step-title-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.steps[Number(e.target.dataset.index)].title = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".step-desc-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.steps[Number(e.target.dataset.index)].description = e.target.value;
      renderPreview();
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.steps = moveItem(state.steps, index, -1);
    if (action === "move-down") state.steps = moveItem(state.steps, index, 1);
    if (action === "remove") state.steps = removeItem(state.steps, index);
    renderSteps();
    renderPreview();
  });
}

function addStep() {
  state.steps.push({ id: uid(), icon: "flag", title: "Bước mới", description: "" });
  renderSteps();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  $("preview-eyebrow").textContent = state.eyebrow;
  $("preview-title").textContent = state.title;
  $("preview-description").textContent = state.description;

  $("preview-steps").innerHTML = state.steps
    .map(
      (step, index) => `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-primary text-white text-xs font-display font-bold flex items-center justify-center shrink-0">${index + 1}</div>
        <div>
          <p class="font-display font-medium text-sm text-slate-900 flex items-center gap-1"><span class="material-symbols-outlined text-base text-primary">${escapeHtml(step.icon || "flag")}</span>${escapeHtml(step.title)}</p>
          <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(step.description)}</p>
        </div>
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

  $("btn-add-step").addEventListener("click", addStep);

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
    await saveSection("workflow", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderSteps();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
