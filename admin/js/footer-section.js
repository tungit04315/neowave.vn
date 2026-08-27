// footer-section.js
// Toàn bộ logic riêng cho màn hình "Website > Footer": mô tả công ty,
// các cột liên kết (mỗi cột có tiêu đề + nhiều link), thông tin liên hệ
// (địa chỉ/email/điện thoại — trước đây KHÔNG có field nào cho phần này),
// social links (đã bổ sung TikTok để khớp trang chủ), dòng bản quyền +
// legal links (Privacy Policy / Terms of Service). Cùng khuôn mẫu với
// hero-section.js / header-section.js.

import { getSection, saveSection } from "./firestore-service.js";
import { uid, escapeHtml, moveItem, removeItem, bindRepeaterControls } from "./repeater-utils.js";

const DEFAULT_FOOTER = {
  description:
    "Chuyên gia Marketing Online | Website - Facebook - TikTok - AI - Phần Mềm Bán Hàng - ERP - HRM - PM Kế Toán ...\n📞 0776 114 101 | 📞 0774 827 890",
  columns: [
    {
      id: uid(),
      title: "Company",
      links: [
        { label: "About Us", link: "#" },
        { label: "Careers", link: "#" },
        { label: "Blog", link: "#" },
        { label: "Legal", link: "#" },
      ],
    },
    {
      id: uid(),
      title: "Services",
      links: [
        { label: "Web Design", link: "#" },
        { label: "Development", link: "#" },
        { label: "SEO Marketing", link: "#" },
        { label: "Branding", link: "#" },
      ],
    },
  ],
  contactInfo: {
    address: "P. Hiệp Thành, Quận 12, TP Hồ Chí Minh",
    email: "quoctung.work@gmail.com",
    phone: "+84 776 114 101",
  },
  socialLinks: [
    { id: uid(), platform: "Facebook", url: "https://www.facebook.com/neowavemarketing" },
    { id: uid(), platform: "TikTok", url: "https://www.tiktok.com/@neo.wave.marketin" },
    { id: uid(), platform: "Email", url: "mailto:quoctung.work@gmail.com" },
  ],
  copyrightText: "© 2026 NEO WAVE. All rights reserved.",
  legalLinks: [
    { id: uid(), label: "Privacy Policy", link: "#" },
    { id: uid(), label: "Terms of Service", link: "#" },
  ],
};

let state = structuredClone(DEFAULT_FOOTER);
let originalState = structuredClone(DEFAULT_FOOTER);
let currentUser = null;

const $ = (id) => document.getElementById(id);

// Textarea "Nhãn | Link" mỗi dòng 1 mục <-> mảng {label, link}
function linkLinesToArray(text) {
  return String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, link] = line.split("|").map((s) => (s || "").trim());
      return { label: label || "", link: link || "#" };
    });
}

function arrayToLinkLines(arr) {
  return (arr || []).map((l) => `${l.label} | ${l.link}`).join("\n");
}

export async function initFooterPage(user) {
  currentUser = user;

  try {
    const saved = await getSection("footer");
    if (saved) {
      state = {
        ...structuredClone(DEFAULT_FOOTER),
        ...saved,
        contactInfo: { ...structuredClone(DEFAULT_FOOTER.contactInfo), ...(saved.contactInfo || {}) },
      };
      if (!Array.isArray(state.columns) || state.columns.length === 0) {
        state.columns = structuredClone(DEFAULT_FOOTER.columns);
      }
      if (!Array.isArray(state.socialLinks)) state.socialLinks = structuredClone(DEFAULT_FOOTER.socialLinks);
      if (!Array.isArray(state.legalLinks)) state.legalLinks = structuredClone(DEFAULT_FOOTER.legalLinks);
    }
  } catch (err) {
    console.warn("Không tải được dữ liệu Footer từ Firestore, dùng dữ liệu mặc định:", err.message);
  }
  originalState = structuredClone(state);

  fillFormFromState();
  renderColumns();
  renderSocialLinks();
  renderLegalLinks();
  renderPreview();
  bindEvents();
}

function fillFormFromState() {
  $("description-input").value = state.description;
  $("copyright-input").value = state.copyrightText;
  if ($("contact-address-input")) $("contact-address-input").value = state.contactInfo.address || "";
  if ($("contact-email-input")) $("contact-email-input").value = state.contactInfo.email || "";
  if ($("contact-phone-input")) $("contact-phone-input").value = state.contactInfo.phone || "";
}

function readFormIntoState() {
  state.description = $("description-input").value;
  state.copyrightText = $("copyright-input").value;
  if ($("contact-address-input")) {
    state.contactInfo = {
      address: $("contact-address-input").value,
      email: $("contact-email-input").value,
      phone: $("contact-phone-input").value,
    };
  }
}

// ---------- Repeater: columns (mỗi cột = tiêu đề + textarea link) ----------

function renderColumns() {
  const container = $("columns-list");
  container.innerHTML = state.columns
    .map(
      (col, index) => `
    <div class="repeater-row items-stretch" data-index="${index}">
      <div class="flex-1 space-y-2">
        <input type="text" class="col-title-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium"
               placeholder="Tiêu đề cột (VD: Company)" value="${escapeHtml(col.title)}" data-index="${index}" />
        <textarea class="col-links-input field-textarea w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  rows="3" placeholder="Nhãn | Link (mỗi dòng 1 mục)" data-index="${index}">${escapeHtml(arrayToLinkLines(col.links))}</textarea>
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="move-up" data-index="${index}" title="Lên" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button type="button" data-repeater-action="move-down" data-index="${index}" title="Xuống" ${index === state.columns.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".col-title-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.columns[Number(e.target.dataset.index)].title = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".col-links-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.columns[Number(e.target.dataset.index)].links = linkLinesToArray(e.target.value);
      renderPreview();
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "move-up") state.columns = moveItem(state.columns, index, -1);
    if (action === "move-down") state.columns = moveItem(state.columns, index, 1);
    if (action === "remove") state.columns = removeItem(state.columns, index);
    renderColumns();
    renderPreview();
  });
}

function addColumn() {
  state.columns.push({ id: uid(), title: "Cột mới", links: [] });
  renderColumns();
  renderPreview();
}

// ---------- Repeater: socialLinks ----------

function renderSocialLinks() {
  const container = $("social-list");
  container.innerHTML = state.socialLinks
    .map(
      (s, index) => `
    <div class="repeater-row" data-index="${index}">
      <div class="grid grid-cols-2 gap-2 flex-1">
        <input type="text" class="social-platform-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Nền tảng (VD: Facebook, TikTok, Email)" value="${escapeHtml(s.platform)}" data-index="${index}" />
        <input type="text" class="social-url-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="URL" value="${escapeHtml(s.url)}" data-index="${index}" />
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".social-platform-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.socialLinks[Number(e.target.dataset.index)].platform = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".social-url-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.socialLinks[Number(e.target.dataset.index)].url = e.target.value;
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "remove") state.socialLinks = removeItem(state.socialLinks, index);
    renderSocialLinks();
    renderPreview();
  });
}

function addSocialLink() {
  state.socialLinks.push({ id: uid(), platform: "", url: "" });
  renderSocialLinks();
  renderPreview();
}

// ---------- Repeater: legalLinks ----------

function renderLegalLinks() {
  const container = $("legal-list");
  if (!container) return;
  container.innerHTML = state.legalLinks
    .map(
      (l, index) => `
    <div class="repeater-row" data-index="${index}">
      <div class="grid grid-cols-2 gap-2 flex-1">
        <input type="text" class="legal-label-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Nhãn (VD: Privacy Policy)" value="${escapeHtml(l.label)}" data-index="${index}" />
        <input type="text" class="legal-link-input w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
               placeholder="Link" value="${escapeHtml(l.link)}" data-index="${index}" />
      </div>
      <div class="repeater-controls">
        <button type="button" data-repeater-action="remove" data-index="${index}" title="Xoá" class="text-red-500"><i class="ti ti-trash"></i></button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll(".legal-label-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.legalLinks[Number(e.target.dataset.index)].label = e.target.value;
      renderPreview();
    })
  );
  container.querySelectorAll(".legal-link-input").forEach((el) =>
    el.addEventListener("input", (e) => {
      state.legalLinks[Number(e.target.dataset.index)].link = e.target.value;
    })
  );

  bindRepeaterControls(container, (action, index) => {
    if (action === "remove") state.legalLinks = removeItem(state.legalLinks, index);
    renderLegalLinks();
    renderPreview();
  });
}

function addLegalLink() {
  state.legalLinks.push({ id: uid(), label: "Link mới", link: "#" });
  renderLegalLinks();
  renderPreview();
}

// ---------- Preview ----------

function renderPreview() {
  $("preview-description").textContent = state.description;
  $("preview-copyright").textContent = state.copyrightText;

  $("preview-columns").innerHTML = state.columns
    .map(
      (col) => `
      <div>
        <p class="font-display font-medium text-slate-900 text-xs mb-2">${escapeHtml(col.title)}</p>
        <ul class="space-y-1">
          ${(col.links || []).map((l) => `<li class="text-xs text-slate-400">${escapeHtml(l.label)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  if ($("preview-contact-info")) {
    $("preview-contact-info").innerHTML = `
      <li>${escapeHtml(state.contactInfo.address || "")}</li>
      <li>${escapeHtml(state.contactInfo.email || "")}</li>
      <li>${escapeHtml(state.contactInfo.phone || "")}</li>`;
  }

  $("preview-social").innerHTML = state.socialLinks
    .map((s) => `<span class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">${escapeHtml((s.platform || "?")[0])}</span>`)
    .join("");

  if ($("preview-legal")) {
    $("preview-legal").innerHTML = state.legalLinks
      .map((l) => `<span class="text-[10px] text-slate-400">${escapeHtml(l.label)}</span>`)
      .join(" · ");
  }
}

// ---------- Events ----------

function bindEvents() {
  ["description-input", "copyright-input"].forEach((id) => {
    $(id).addEventListener("input", () => {
      readFormIntoState();
      renderPreview();
    });
  });

  ["contact-address-input", "contact-email-input", "contact-phone-input"].forEach((id) => {
    if ($(id)) {
      $(id).addEventListener("input", () => {
        readFormIntoState();
        renderPreview();
      });
    }
  });

  $("btn-add-column").addEventListener("click", addColumn);
  $("btn-add-social").addEventListener("click", addSocialLink);
  if ($("btn-add-legal")) $("btn-add-legal").addEventListener("click", addLegalLink);

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
    await saveSection("footer", state, currentUser);
    originalState = structuredClone(state);
    statusEl.textContent = "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN");
  } catch (err) {
    statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
}

function handleUndo() {
  state = structuredClone(originalState);
  fillFormFromState();
  renderColumns();
  renderSocialLinks();
  renderLegalLinks();
  renderPreview();
  $("save-status").textContent = "Đã khôi phục về lần lưu gần nhất.";
}
