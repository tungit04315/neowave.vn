// hero-loader.js
// Đọc dữ liệu Hero Section từ Firestore (document "sections/hero", do
// admin-cms/js/hero-section.js ghi ra) rồi gán vào các phần tử tương ứng
// trên trang chủ. Ảnh không lưu trực tiếp trong "sections/hero" — chỉ có
// { mediaId } trỏ sang collection "media_base64", nên cần đọc thêm 1 bước
// để lấy chuỗi base64 thật rồi gán vào <img src="...">.
//
// Nếu Firestore lỗi/offline hoặc chưa có dữ liệu, trang chủ vẫn giữ nguyên
// nội dung tĩnh đã viết sẵn trong index.html — KHÔNG để trắng trang.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Giữ đúng logic bọc span gradient cho phần tiêu đề nổi bật, đồng bộ với
// admin-cms/js/hero-section.js (highlightTitle).
function highlightTitle(titleMain, highlight) {
    const escaped = titleMain
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");
    if (!highlight) return escaped;
    const safeHighlight = escapeHtml(highlight);
    return escaped.replace(safeHighlight, `<span class="text-gradient-clip">${safeHighlight}</span>`);
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

function applyHero(hero) {
    if ($("hero-eyebrow") && hero.eyebrow) $("hero-eyebrow").textContent = hero.eyebrow;
    if ($("hero-title") && hero.titleMain) {
        $("hero-title").innerHTML = highlightTitle(hero.titleMain, hero.titleHighlight);
    }
    if ($("hero-description") && hero.description) $("hero-description").textContent = hero.description;

    if (hero.primaryButton) {
        if ($("hero-primary-text") && hero.primaryButton.text) $("hero-primary-text").textContent = hero.primaryButton.text;
        if ($("hero-primary-link") && hero.primaryButton.link) $("hero-primary-link").setAttribute("href", hero.primaryButton.link);
    }
    if (hero.secondaryButton) {
        if ($("hero-secondary-text") && hero.secondaryButton.text) $("hero-secondary-text").textContent = hero.secondaryButton.text;
        if ($("hero-secondary-link") && hero.secondaryButton.link) $("hero-secondary-link").setAttribute("href", hero.secondaryButton.link);
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
        if ($("hero-stat-label") && hero.floatingStat.label) $("hero-stat-label").textContent = hero.floatingStat.label;
        if ($("hero-stat-value") && hero.floatingStat.value) $("hero-stat-value").textContent = hero.floatingStat.value;
    }
}

async function applyHeroImage(hero) {
    const imgEl = $("hero-image");
    if (!imgEl || !hero.image?.mediaId) return; // giữ ảnh tĩnh mặc định nếu chưa có ảnh từ CMS
    try {
        const dataUrl = await getImageById(hero.image.mediaId);
        if (dataUrl) imgEl.src = dataUrl;
    } catch (err) {
        console.warn("Không tải được ảnh Hero từ media_base64, giữ ảnh mặc định:", err.message);
    }
}

async function initHeroFromFirestore() {
    try {
        const hero = await getSection("hero");
        if (!hero) return; // chưa có dữ liệu -> giữ nguyên nội dung tĩnh có sẵn
        applyHero(hero);
        await applyHeroImage(hero);
    } catch (err) {
        console.warn("Không tải được dữ liệu Hero từ Firestore, hiển thị nội dung mặc định:", err.message);
    }
}

initHeroFromFirestore();