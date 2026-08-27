// site-loader.js
// Đọc dữ liệu từng section từ Firestore (collection "sections", do admin-cms
// ghi ra khi bấm "Lưu thay đổi") và cập nhật vào trang chủ public (index.html).
//
// NGUYÊN TẮC QUAN TRỌNG:
// - Với MỖI section, nếu document tương ứng trong Firestore KHÔNG tồn tại
//   (nghĩa là trong CMS chưa từng bấm "Lưu thay đổi" cho section đó) thì
//   hàm apply* sẽ return sớm và KHÔNG đụng vào DOM — toàn bộ nội dung tĩnh
//   viết sẵn trong index.html được giữ nguyên y như cũ.
// - Với MỖI field cụ thể bên trong 1 section, nếu field đó rỗng/không có
//   trong dữ liệu đã lưu thì cũng bỏ qua, không ghi đè — tránh trường hợp
//   lưu thiếu 1 field làm mất nội dung mặc định của field đó trên trang chủ.
// - Nếu Firestore lỗi/offline (mất mạng, chặn CDN...) toàn bộ quá trình bị
//   "nuốt" lỗi (try/catch) và trang chủ vẫn hiển thị nội dung tĩnh — KHÔNG
//   bao giờ làm trắng trang hay vỡ giao diện.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function getSection(sectionId) {
  const snap = await getDoc(doc(db, "sections", sectionId));
  return snap.exists() ? snap.data() : null;
}

async function getImageById(mediaId) {
  if (!mediaId) return null;
  const snap = await getDoc(doc(db, "media_base64", mediaId));
  return snap.exists() ? snap.data().dataUrl : null;
}

// ---------- Header ----------

async function applyHeader() {
  const data = await getSection("header");
  if (!data) return;

  if (data.logo?.type === "image") {
    try {
      const url = data.logo.mediaId ? await getImageById(data.logo.mediaId) : data.logo.url;
      if (url && $("header-logo-img")) $("header-logo-img").src = url;
    } catch (err) {
      console.warn("Không tải được logo header:", err.message);
    }
  }

  if (Array.isArray(data.navItems) && data.navItems.length && $("header-nav")) {
    $("header-nav").innerHTML = data.navItems
      .map(
        (item) =>
          `<a class="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="${escapeHtml(item.link || "#")}">${escapeHtml(item.label || "")}</a>`
      )
      .join("");
  }

  if (data.ctaButton) {
    if (data.ctaButton.enabled === false && $("header-cta-button")) {
      $("header-cta-button").style.display = "none";
    }
    if (data.ctaButton.text && $("header-cta-link")) $("header-cta-link").textContent = data.ctaButton.text;
    if (data.ctaButton.link && $("header-cta-link")) $("header-cta-link").setAttribute("href", data.ctaButton.link);
  }
}

// ---------- Hero ----------

function highlightTitle(titleMain, highlight) {
  const escaped = String(titleMain ?? "")
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
  if (!highlight) return escaped;
  const safeHighlight = escapeHtml(highlight);
  return escaped.replace(safeHighlight, `<span class="text-gradient-clip">${safeHighlight}</span>`);
}

async function applyHero() {
  const hero = await getSection("hero");
  if (!hero) return;

  if (hero.eyebrow && $("hero-eyebrow")) $("hero-eyebrow").textContent = hero.eyebrow;
  if (hero.titleMain && $("hero-title")) $("hero-title").innerHTML = highlightTitle(hero.titleMain, hero.titleHighlight);
  if (hero.description && $("hero-description")) $("hero-description").textContent = hero.description;

  if (hero.primaryButton) {
    if (hero.primaryButton.text && $("hero-primary-link")) $("hero-primary-link").textContent = hero.primaryButton.text;
    if (hero.primaryButton.link && $("hero-primary-link")) $("hero-primary-link").setAttribute("href", hero.primaryButton.link);
  }
  if (hero.secondaryButton) {
    if (hero.secondaryButton.text && $("hero-secondary-link")) $("hero-secondary-link").textContent = hero.secondaryButton.text;
    if (hero.secondaryButton.link && $("hero-secondary-link")) $("hero-secondary-link").setAttribute("href", hero.secondaryButton.link);
  }

  if (Array.isArray(hero.trustBadges) && hero.trustBadges.length && $("hero-badges")) {
    $("hero-badges").innerHTML = hero.trustBadges
      .map(
        (b) => `<div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-accent-blue">check_circle</span>
          <span>${escapeHtml(b)}</span>
        </div>`
      )
      .join("");
  }

  if (hero.floatingStat) {
    if (hero.floatingStat.label && $("hero-stat-label")) $("hero-stat-label").textContent = hero.floatingStat.label;
    if (hero.floatingStat.value && $("hero-stat-value")) $("hero-stat-value").textContent = hero.floatingStat.value;
  }

  if (hero.image?.mediaId && $("hero-image")) {
    try {
      const dataUrl = await getImageById(hero.image.mediaId);
      if (dataUrl) $("hero-image").src = dataUrl;
    } catch (err) {
      console.warn("Không tải được ảnh Hero, giữ ảnh mặc định:", err.message);
    }
  }
}

// ---------- Services ----------

function serviceCardHtml(item) {
  const color = item.color || "primary";
  return `
    <div class="group relative bg-slate-50 rounded-2xl p-8 hover:bg-white hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border border-slate-100 hover:border-primary/20 overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-${color}/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-150 group-hover:bg-${color}/10"></div>
      <div class="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center text-${color} mb-6 relative z-10 group-hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-3xl">${escapeHtml(item.icon || "language")}</span>
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-3 group-hover:text-${color} transition-colors">${escapeHtml(item.title || "")}</h3>
      <p class="text-slate-600 mb-6 leading-relaxed">${escapeHtml(item.description || "")}</p>
      <a class="inline-flex items-center text-sm font-bold text-slate-900 group-hover:text-${color} transition-colors" href="${escapeHtml(item.link || "#")}">
        Xem chi tiết <span class="material-symbols-outlined text-lg ml-1 group-hover:ml-2 transition-all">arrow_forward</span>
      </a>
    </div>`;
}

async function applyServices() {
  const data = await getSection("services");
  if (!data) return;

  if (data.eyebrow && $("services-eyebrow")) $("services-eyebrow").textContent = data.eyebrow;
  if (data.title && $("services-title")) $("services-title").textContent = data.title;

  if (data.viewAllText) {
    document.querySelectorAll(".services-viewall-text").forEach((el) => (el.textContent = data.viewAllText));
  }
  // Lưu ý: nút "Xem tất cả dịch vụ" hiện là <button> (không có href) trong
  // giao diện gốc nên viewAllLink chưa có nơi để gán — chỉ cập nhật viewAllText.

  if (Array.isArray(data.items) && data.items.length && $("services-grid")) {
    $("services-grid").innerHTML = data.items.map(serviceCardHtml).join("");
  }
}

// ---------- Stats ----------

async function applyStats() {
  const data = await getSection("stats");
  if (!data) return;
  if (Array.isArray(data.items) && data.items.length && $("stats-grid")) {
    $("stats-grid").innerHTML = data.items
      .map(
        (item) => `
      <div class="flex flex-col items-center text-center">
        <div class="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent-blue mb-2">${escapeHtml(item.value || "")}</div>
        <div class="text-sm lg:text-base font-medium text-slate-600">${escapeHtml(item.label || "")}</div>
      </div>`
      )
      .join("");
  }
}

// ---------- CTA ----------

async function applyCta() {
  const data = await getSection("cta");
  if (!data) return;

  if (data.title && $("cta-title")) $("cta-title").textContent = data.title;
  if (data.description && $("cta-description")) $("cta-description").textContent = data.description;
  if (data.primaryButton) {
    if (data.primaryButton.text && $("cta-primary-link")) $("cta-primary-link").textContent = data.primaryButton.text;
    if (data.primaryButton.link && $("cta-primary-link")) $("cta-primary-link").setAttribute("href", data.primaryButton.link);
  }
  if (data.secondaryButton) {
    if (data.secondaryButton.text && $("cta-secondary-link")) $("cta-secondary-link").textContent = data.secondaryButton.text;
    if (data.secondaryButton.link && $("cta-secondary-link")) $("cta-secondary-link").setAttribute("href", data.secondaryButton.link);
  }
}

// ---------- Workflow ----------

function workflowStepHtml(step, index) {
  const isActive = index === 0;
  const circleClass = isActive
    ? "size-16 rounded-full bg-white dark:bg-background-dark border-2 border-primary text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-6"
    : "size-16 rounded-full bg-white dark:bg-background-dark border-2 border-slate-200 dark:border-slate-700 text-text-muted group-hover:border-primary group-hover:text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-all mb-6";
  return `
    <div class="flex flex-col items-center text-center group">
      <div class="${circleClass}">
        <span class="material-symbols-outlined text-3xl">${escapeHtml(step.icon || "check_circle")}</span>
      </div>
      <h3 class="font-bold text-lg mb-2">${escapeHtml(step.title || "")}</h3>
      <p class="text-sm text-text-muted dark:text-slate-400">${escapeHtml(step.description || "")}</p>
    </div>`;
}

async function applyWorkflow() {
  const data = await getSection("workflow");
  if (!data) return;

  if (data.eyebrow && $("workflow-eyebrow")) $("workflow-eyebrow").textContent = data.eyebrow;
  if (data.title && $("workflow-title")) $("workflow-title").textContent = data.title;

  if (Array.isArray(data.steps) && data.steps.length && $("workflow-steps")) {
    $("workflow-steps").innerHTML = data.steps.map(workflowStepHtml).join("");
    // Grid vốn được thiết kế cho 5 cột (md:grid-cols-5) — nếu số bước khác 5,
    // vẫn hiển thị đúng nhờ Tailwind tự xuống dòng, chỉ không đều cột trên desktop.
  }
}

// ---------- Pricing ----------

function pricingPlanHtml(plan) {
  const highlighted = !!plan.highlighted;
  const cardClass = highlighted
    ? "bg-white dark:bg-background-dark rounded-2xl p-8 border-2 border-primary relative shadow-2xl scale-105 z-10"
    : "bg-white dark:bg-background-dark rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all hover:shadow-xl";
  const titleClass = highlighted ? "text-xl font-bold mb-2 text-primary" : "text-xl font-bold mb-2";
  const buttonClass = highlighted
    ? "w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors mb-8 shadow-lg shadow-primary/25"
    : "w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:border-primary hover:text-primary transition-colors mb-8";

  const includedLi = (plan.features || [])
    .map(
      (f) => `
      <li class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary text-lg">check_circle</span>
        <span>${escapeHtml(f)}</span>
      </li>`
    )
    .join("");
  const excludedLi = (plan.excludedFeatures || [])
    .map(
      (f) => `
      <li class="flex items-center gap-3 text-slate-400">
        <span class="material-symbols-outlined text-lg">cancel</span>
        <span>${escapeHtml(f)}</span>
      </li>`
    )
    .join("");

  return `
    <div class="${cardClass}">
      ${highlighted ? `<div class="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">PHỔ BIẾN</div>` : ""}
      <h3 class="${titleClass}">${escapeHtml(plan.name || "")}</h3>
      <div class="flex items-baseline gap-1 mb-6">
        <span class="text-4xl font-bold">${escapeHtml(plan.price || "")}</span>
        <span class="text-text-muted text-sm">${escapeHtml(plan.period || "")}</span>
      </div>
      <p class="text-text-muted text-sm mb-6">${escapeHtml(plan.description || "")}</p>
      <button class="${buttonClass}">
        <a href="${escapeHtml(plan.buttonLink || "#")}">${escapeHtml(plan.buttonText || "Chọn gói dịch vụ")}</a>
      </button>
      <ul class="flex flex-col gap-4 text-sm">${includedLi}${excludedLi}</ul>
    </div>`;
}

async function applyPricing() {
  const data = await getSection("pricing");
  if (!data) return;

  if (data.title && $("pricing-title")) $("pricing-title").textContent = data.title;
  if (data.description && $("pricing-description")) $("pricing-description").textContent = data.description;

  if (Array.isArray(data.plans) && data.plans.length && $("pricing-plans")) {
    $("pricing-plans").innerHTML = data.plans.map(pricingPlanHtml).join("");
  }
}

// ---------- Footer ----------

const SOCIAL_ICON_CLASS = {
  facebook: "fa-brands fa-facebook-f",
  tiktok: "fa-brands fa-tiktok",
  email: "fa-solid fa-envelope",
  instagram: "fa-brands fa-instagram",
  youtube: "fa-brands fa-youtube",
  zalo: "fa-solid fa-comment-dots",
  linkedin: "fa-brands fa-linkedin-in",
};

function socialIconClass(platform) {
  const key = String(platform || "").trim().toLowerCase();
  return SOCIAL_ICON_CLASS[key] || "fa-solid fa-link";
}

async function applyFooter() {
  const data = await getSection("footer");
  if (!data) return;

  if (data.description && $("footer-description")) {
    $("footer-description").innerHTML = String(data.description)
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br>");
  }

  if (Array.isArray(data.columns) && data.columns.length) {
    // Build lại toàn bộ nội dung mỗi cột (title + danh sách link) theo dữ
    // liệu đã lưu. Nếu CMS có ít cột hơn 2 cột tĩnh mặc định, cột dư giữ
    // nguyên nội dung tĩnh cũ (không bị xoá).
    document.querySelectorAll("[data-footer-column]").forEach((colEl) => {
      const idx = Number(colEl.getAttribute("data-footer-column"));
      const col = data.columns[idx];
      if (!col) return;
      const links = Array.isArray(col.links) ? col.links : [];
      colEl.innerHTML =
        `<h4 class="font-bold text-lg mb-2" data-footer-col-title>${escapeHtml(col.title || "")}</h4>` +
        links
          .map(
            (l) =>
              `<a class="text-text-muted dark:text-slate-400 hover:text-primary text-sm transition-colors" href="${escapeHtml(l.link || "#")}">${escapeHtml(l.label || "")}</a>`
          )
          .join("");
    });
  }

  if (data.contactInfo) {
    if (data.contactInfo.address && $("footer-address")) $("footer-address").textContent = data.contactInfo.address;
    if (data.contactInfo.email && $("footer-email")) $("footer-email").textContent = data.contactInfo.email;
    if (data.contactInfo.phone && $("footer-phone")) $("footer-phone").textContent = data.contactInfo.phone;
  }

  if (Array.isArray(data.socialLinks) && data.socialLinks.length && $("footer-social-links")) {
    $("footer-social-links").innerHTML = data.socialLinks
      .map(
        (s) => `
      <a class="size-10 rounded-full bg-background-light dark:bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all" href="${escapeHtml(s.url || "#")}">
        <span class="text-xs font-bold"><i class="${socialIconClass(s.platform)}"></i></span>
      </a>`
      )
      .join("");
  }

  if (data.copyrightText && $("footer-copyright")) $("footer-copyright").textContent = data.copyrightText;

  if (Array.isArray(data.legalLinks) && data.legalLinks.length && $("footer-legal-links")) {
    $("footer-legal-links").innerHTML = data.legalLinks
      .map(
        (l) =>
          `<a class="text-xs text-text-muted dark:text-slate-500 hover:text-primary" href="${escapeHtml(l.link || "#")}">${escapeHtml(l.label || "")}</a>`
      )
      .join("");
  }
}

// ---------- Khởi chạy ----------
// Mỗi section được nạp độc lập (Promise.allSettled): nếu 1 section lỗi
// (vd. dữ liệu sai định dạng), các section khác vẫn nạp bình thường,
// không section nào kéo sập cả trang.

async function safeRun(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[site-loader] Không tải được section "${name}" từ Firestore, giữ nội dung mặc định:`, err.message);
  }
}

Promise.allSettled([
  safeRun("header", applyHeader),
  safeRun("hero", applyHero),
  safeRun("services", applyServices),
  safeRun("stats", applyStats),
  safeRun("cta", applyCta),
  safeRun("workflow", applyWorkflow),
  safeRun("pricing", applyPricing),
  safeRun("footer", applyFooter),
]);
