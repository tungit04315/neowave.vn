// pricing-section.js
// Toàn bộ logic riêng cho màn hình "Nội dung > Bảng giá": tiêu đề chung
// của section + danh sách 3 gói giá thật (tên, giá, chu kỳ, tính năng CÓ,
// tính năng KHÔNG có/bị gạch — khớp đúng cấu trúc trang chủ thật vốn có
// khái niệm "tính năng bị loại trừ" hiển thị icon xám gạch chéo, gói nổi
// bật, nút CTA). Cùng khuôn mẫu với hero-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls, linesToArray, arrayToLines } from "./repeater-utils.js";

const FIELD_LIMITS = { eyebrow: 80, title: 120, description: 200 };

const DEFAULT_PRICING = {
  eyebrow: "",
  title: "Giá cả minh bạch",
  description: "Hãy chọn gói dịch vụ hoàn hảo cho quá trình chuyển đổi số của bạn.",
  plans: [
    {
      id: uid(),
      name: "Starter",
      price: "7.000.000đ",
      period: "/dự án",
      description: "Hoàn hảo cho các doanh nghiệp nhỏ muốn thiết lập sự hiện diện trực tuyến.",
      features: ["Thiết kế giao diện bản quyền", "Tương thích các thiết bị Máy tính bảng, Điện thoại thông minh.", "Cài đặt SEO cơ bản"],
      excludedFeatures: ["Giỏ hàng thương mại"],
      highlighted: false,
      buttonText: "Chọn gói dịch vụ",
      buttonLink: "https://zalo.me/0776114101",
    },
    {
      id: uid(),
      name: "Business",
      price: "10.000.000đ",
      period: "/dự án",
      description: "Giải pháp toàn diện dành cho các công ty đang phát triển cần mở rộng quy mô.",
      features: ["Giỏ hàng thương mại", "Đăng nhập/Đăng ký", "Tạo mã giảm giá sản phẩm", "Tính năng gửi ý sản phẩm"],
      excludedFeatures: [],
      highlighted: true,
      buttonText: "Chọn gói dịch vụ",
      buttonLink: "https://zalo.me/0776114101",
    },
    {
      id: uid(),
      name: "Premium",
      price: "GIÁ LIÊN HỆ",
      period: "/dự án",
      description: "Phát triển phần mềm cấp doanh nghiệp đáp ứng các yêu cầu phức tạp.",
      features: ["Form đặt tour du lịch", "Danh mục yêu thích, Tìm kiếm gợi ý", "Tuỳ chỉnh giám giá cho từng thành viên", "Các tính năng nâng cao & lập trình theo yêu cầu"],
      excludedFeatures: [],
      highlighted: false,
      buttonText: "Chọn gói dịch vụ",
      buttonLink: "https://zalo.me/0776114101",
    },
  ],
};

let state = structuredClone(DEFAULT_PRICING);
let originalState = structuredClone(DEFAULT_PRICING);
let currentUser = null;

const $ = (id) => document.getElementById(id);

export async function initPricingPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("pricing");
    if (saved) {
      state = { ...structuredClone(DEFAULT_PRICING), ...saved };
      if (!Array.isArray(state.plans) || state.plans.length === 0) {
        state.plans = structuredClone(DEFAULT_PRICING.plans);
      }
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Bảng giá từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderPlans();
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

// ---------- Repeater: plans ----------

function renderPlans() {
  const container = $("plans-list");
  container.innerHTML = state.plans
    .map(
      (plan, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="flex-1 space-y-2">
        <div class="grid grid-cols-3 gap-2">
          <input type="text" class="plan-name-input px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium"
                 placeholder="Tên gói" value="${escapeHtml(plan.name)}" data-index="${index}" />
          <input type="text" class="plan-price-input px-3 py-2 rounded-lg border border-slate-200 text-sm"
                 placeholder="Giá" value="${escapeHtml(plan.price)}" data-index="${index}" />
          <input type="text" class="plan-period-input px-3 py-2 rounded-lg border border-slate-200 text-sm"
                 placeholder="Chu kỳ (VD: /dự án)" value="${escapeHtml(plan.period)}" data-index="${index}" />
        </div>
        <textarea class="plan-description-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  rows="2" placeholder="Mô tả ngắn gói" data-index="${index}">${escapeHtml(plan.description || "")}</textarea>
        <div>
          <label class="text-[11px] text-slate-400 block mb-1">Tính năng CÓ (mỗi dòng 1 tính năng)</label>
          <textarea class="plan-features-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    rows="3" placeholder="Mỗi dòng 1 tính năng" data-index="${index}">${escapeHtml(arrayToLines(plan.features))}</textarea>
        </div>
        <div>
          <label class="text-[11px] text-slate-400 block mb-1">Tính năng KHÔNG có (hiển thị gạch xám, VD: Starter thiếu "Giỏ hàng thương mại")</label>
          <textarea class="plan-excluded-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    rows="2" placeholder="Mỗi dòng 1 tính năng bị loại trừ" data-index="${index}">${escapeHtml(arrayToLines(plan.excludedFeatures))}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" class="plan-btn-text-input px-3 py-2 rounded-lg border border-slate-200 text-xs"
                 placeholder="Nội dung nút" value="${escapeHtml(plan.buttonText)}" data-index="${index}" />
          <input type="text" class="plan-btn-link-input px-3 py-2 rounded-lg border border-slate-200 text-xs"
                 placeholder="Link nút" value="${escapeHtml(plan.buttonLink)}" data-index="${index}" />
        </div>
        <label class="inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" class="plan-highlighted-input" data-index="${index}" ${plan.highlighted ? "checked" : ""} />
          Đánh dấu gói nổi bật (PHỔ BIẾN)
        </label>
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.plans.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  const bindText = (cls, field, isArray) =>
    container.querySelectorAll(cls).forEach((el) =>
      el.addEventListener("input", (e) => {
        const i = Number(e.target.dataset.index);
        state.plans[i][field] = isArray ? linesToArray(e.target.value) : e.target.value;
        renderPreview();
      })
    );

  bindText(".plan-name-input", "name");
  bindText(".plan-price-input", "price");
  bindText(".plan-period-input", "period");
  bindText(".plan-description-input", "description");
  bindText(".plan-features-input", "features", true);
  bindText(".plan-excluded-input", "excludedFeatures", true);
  bindText(".plan-btn-text-input", "buttonText");
  bindText(".plan-btn-link-input", "buttonLink");

  container.querySelectorAll(".plan-highlighted-input").forEach((el) =>
    el.addEventListener("change", (e) => {
      state.plans[Number(e.target.dataset.index)].highlighted = e.target.checked;
      renderPreview();
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.plans = moveItem(state.plans, index, -1);
    if (action === "move-down") state.plans = moveItem(state.plans, index, 1);
    if (action === "remove") state.plans = removeItem(state.plans, index);
    renderPlans();
    renderPreview();
  });
}

function addPlan() {
  state.plans.push({
    id: uid(),
    name: "Gói mới",
    price: "0đ",
    period: "/dự án",
    description: "",
    features: [],
    excludedFeatures: [],
    highlighted: false,
    buttonText: "Chọn gói dịch vụ",
    buttonLink: "https://zalo.me/0776114101",
  });
  renderPlans();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  $("preview-eyebrow").textContent = state.eyebrow;
  $("preview-title").textContent = state.title;
  $("preview-description").textContent = state.description;

  $("preview-plans").innerHTML = state.plans
    .map(
      (plan) => `
      <div class="glass-card rounded-xl p-4 ${plan.highlighted ? "ring-2 ring-primary" : ""}">
        ${plan.highlighted ? '<span class="text-[9px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">PHỔ BIẾN</span>' : ""}
        <p class="font-display font-medium text-sm text-slate-900 mt-2">${escapeHtml(plan.name)}</p>
        <p class="text-lg font-display font-bold text-primary mt-1">${escapeHtml(plan.price)}<span class="text-xs text-slate-400 font-body">${escapeHtml(plan.period)}</span></p>
        <ul class="mt-2 space-y-1">
          ${(plan.features || []).map((f) => `<li class="text-[11px] text-slate-500 flex items-center gap-1"><i class="ti ti-check text-primary"></i>${escapeHtml(f)}</li>`).join("")}
          ${(plan.excludedFeatures || []).map((f) => `<li class="text-[11px] text-slate-300 flex items-center gap-1"><i class="ti ti-x"></i><span class="line-through">${escapeHtml(f)}</span></li>`).join("")}
        </ul>
        <span class="mt-3 inline-block px-3 py-1.5 rounded-full ${plan.highlighted ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-700"} text-[11px] font-medium">${escapeHtml(plan.buttonText)}</span>
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

  $("btn-add-plan").addEventListener("click", addPlan);

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
    await saveSection("pricing", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderPlans();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
