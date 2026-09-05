// contact-widget-loader.js
// Đọc cấu hình "Nút liên hệ nổi" (sections/contactWidget) do admin-cms quản lý
// (CRUD danh sách nút: Gọi ngay / Zalo / Messenger / Email / tuỳ chỉnh...) và:
//   1. Render lại danh sách nút trong khối #contact-links.
//   2. Tự động MỞ panel liên hệ sau X mili-giây khi vào trang chủ, nếu admin bật.
//
// Theo đúng nguyên tắc an toàn của site-loader.js: nếu chưa cấu hình gì trong
// CMS (document không tồn tại) hoặc lỗi mạng/Firestore, script KHÔNG đụng vào
// DOM — 4 nút tĩnh viết sẵn trong index.html vẫn hiển thị y như cũ.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Sinh phần icon bên trong "viên tròn" của 1 nút, theo iconType lưu trong CMS:
//  - "material": tên icon Material Symbols (vd "call", "mail")
//  - "fa"      : class Font Awesome đầy đủ (vd "fa-brands fa-facebook-messenger")
//  - "text"    : chữ ngắn hiển thị thẳng (vd "Zalo") — giống cách làm hiện tại
function iconInnerHtml(btn) {
  const type = btn.iconType || "material";
  const value = btn.iconValue || "";
  if (type === "fa") return `<i class="${escapeHtml(value)} text-[16px]"></i>`;
  if (type === "text") return escapeHtml(value || btn.label || "");
  return `<span class="material-symbols-outlined text-[20px]">${escapeHtml(value || "link")}</span>`;
}

function isExternalLink(link) {
  return /^https?:\/\//i.test(String(link || ""));
}

function buttonHtml(btn) {
  const link = btn.link || "#";
  const targetAttrs = isExternalLink(link) ? ' target="_blank" rel="noopener"' : "";
  const bg = btn.bgColor || "#6812ca";
  // bgColor có thể là mã hex ("#10b981") hoặc 1 chuỗi CSS background bất kỳ
  // (vd gradient "linear-gradient(135deg,#00B2FF,#B620E0)") — admin nhập tự do.
  return `
    <a href="${escapeHtml(link)}"${targetAttrs} class="contact-pill" aria-label="${escapeHtml(btn.label || "")}">
      <span class="contact-pill__icon" style="background:${escapeHtml(bg)};${btn.iconType === "text" ? "border-radius:12px;font-weight:700;font-size:11px;" : ""}">
        ${iconInnerHtml(btn)}
      </span>
      <span>${escapeHtml(btn.label || "")}</span>
    </a>`;
}

function hideWholeWidget() {
  // #contact-toggle nằm trong div.fixed cha (khối floating cả cụm nút + toggle)
  const root = $("contact-toggle")?.closest("div.fixed");
  if (root) root.style.display = "none";
}

function triggerAutoOpen(delayMs) {
  setTimeout(() => {
    const toggleBtn = $("contact-toggle");
    const linksPanel = $("contact-links");
    if (!toggleBtn || !linksPanel) return;
    toggleBtn.setAttribute("aria-expanded", "true");
    toggleBtn.setAttribute("aria-label", "Đóng liên hệ nhanh");
    linksPanel.classList.add("is-open", "scale-100", "opacity-100", "translate-y-0");
    linksPanel.classList.remove("scale-95", "opacity-0", "translate-y-2", "pointer-events-none");
  }, Math.max(0, Number(delayMs) || 0));
}

async function run() {
  let data = null;
  try {
    const snap = await getDoc(doc(db, "sections", "contactWidget"));
    if (!snap.exists()) return; // chưa cấu hình trong CMS -> giữ nguyên 4 nút tĩnh mặc định
    data = snap.data();
  } catch (err) {
    console.warn("[contact-widget-loader] Không tải được cấu hình, giữ mặc định:", err.message);
    return;
  }

  if (data.enabled === false) {
    hideWholeWidget();
    return; // admin tắt hẳn widget -> không cần xử lý gì thêm
  }

  const buttons = Array.isArray(data.buttons) ? data.buttons.filter((b) => b.enabled !== false) : null;
  if (buttons && buttons.length && $("contact-links")) {
    $("contact-links").innerHTML = buttons.map(buttonHtml).join("");
  }

  if (data.autoOpenOnLoad) {
    const SESSION_KEY = "nw_contact_widget_auto_opened";
    const alreadyOpenedThisSession = data.autoOpenOnce && sessionStorage.getItem(SESSION_KEY) === "1";
    if (!alreadyOpenedThisSession) {
      triggerAutoOpen(data.autoOpenDelayMs ?? 1500);
      if (data.autoOpenOnce) sessionStorage.setItem(SESSION_KEY, "1");
    }
  }
}

run();
