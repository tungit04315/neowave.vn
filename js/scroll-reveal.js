// scroll-reveal.js
// Hiệu ứng "xuất hiện khi cuộn trang" kiểu các site hiện đại (Stripe, Linear,
// Vercel...): phần tử mờ dần + trượt nhẹ lên/qua 2 bên khi lọt vào khung nhìn,
// chỉ chạy 1 lần (không lặp lại khi cuộn qua cuộn lại).
//
// KHÔNG cần sửa index.html: script tự gắn thuộc tính data-reveal vào danh
// sách phần tử mục tiêu bên dưới (AUTO_TARGETS), tự tiêm CSS cần thiết, và tự
// theo dõi cả nội dung được site-loader.js (CMS) chèn/ghi đè động sau khi
// trang đã tải xong (services, pricing, workflow, footer...).
//
// Cách dùng file này: chỉ cần thêm 1 dòng <script> vào index.html (xem hướng
// dẫn tích hợp đi kèm) — không cần import gì thêm.

(function () {
  const STYLE_ID = "nw-scroll-reveal-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [data-reveal] {
        opacity: 0;
        transform: translateY(28px);
        transition:
          opacity .8s cubic-bezier(.16,1,.3,1),
          transform .8s cubic-bezier(.16,1,.3,1),
          filter .8s cubic-bezier(.16,1,.3,1);
        transition-delay: var(--nw-reveal-delay, 0ms);
        will-change: opacity, transform;
      }
      [data-reveal="fade"] { transform: none; }
      [data-reveal="fade-left"] { transform: translateX(-36px); }
      [data-reveal="fade-right"] { transform: translateX(36px); }
      [data-reveal="zoom-in"] { transform: scale(.9); }
      [data-reveal="blur-up"] { transform: translateY(20px); filter: blur(10px); }
      [data-reveal].nw-reveal-visible {
        opacity: 1 !important;
        transform: none !important;
        filter: blur(0) !important;
      }
      @media (prefers-reduced-motion: reduce) {
        [data-reveal] {
          transition: none !important;
          opacity: 1 !important;
          transform: none !important;
          filter: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Danh sách selector muốn có hiệu ứng khi cuộn tới + kiểu hiệu ứng + độ trễ
  // "so le" (stagger) giữa các phần tử con. Thêm/bớt/sửa dòng tuỳ ý.
  //   selector : CSS selector. Dùng "A > *" để mỗi con bên trong A so le nhau.
  //   effect   : "fade-up" | "fade" | "fade-left" | "fade-right" | "zoom-in" | "blur-up"
  //   base     : độ trễ khởi điểm (ms) cho phần tử đầu tiên khớp selector
  //   stagger  : độ trễ cộng dồn (ms) cho mỗi phần tử tiếp theo (dùng khi selector khớp nhiều phần tử)
  const AUTO_TARGETS = [
    { selector: "#hero-eyebrow", effect: "fade-up" },
    { selector: "#hero-title", effect: "fade-up", base: 80 },
    { selector: "#hero-description", effect: "fade-up", base: 160 },
    { selector: "#hero-badges > *", effect: "fade-up", base: 220, stagger: 80 },
    { selector: "#stats-grid > *", effect: "zoom-in", stagger: 90 },
    { selector: "#services-grid > *", effect: "fade-up", stagger: 100 },
    { selector: "#workflow-steps > *", effect: "fade-up", stagger: 100 },
    { selector: "#pricing-plans > *", effect: "fade-up", stagger: 120 },
    { selector: "#faq-list > *", effect: "fade-up", stagger: 80 },
    { selector: "footer [data-footer-column]", effect: "fade-up", stagger: 90 },
  ];

  const observed = new WeakSet();
  let io;

  function getObserver() {
    if (io) return io;
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("nw-reveal-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    return io;
  }

  function applyAutoTargets() {
    const observer = getObserver();
    AUTO_TARGETS.forEach(({ selector, effect = "fade-up", base = 0, stagger = 0 }) => {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (observed.has(el)) return;
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", effect);
        el.style.setProperty("--nw-reveal-delay", `${base + index * stagger}ms`);
        observed.add(el);
        observer.observe(el);
      });
    });
  }

  // Cho phép gắn tay data-reveal="..." data-reveal-delay="..." trực tiếp
  // trong HTML (ngoài danh sách AUTO_TARGETS) — engine này sẽ tự bắt luôn.
  function applyManualTargets() {
    const observer = getObserver();
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (observed.has(el)) return;
      const delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.setProperty("--nw-reveal-delay", `${delay}ms`);
      observed.add(el);
      observer.observe(el);
    });
  }

  function scan() {
    applyAutoTargets();
    applyManualTargets();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  // Services/Pricing/Workflow/Footer... có thể bị site-loader.js (đọc CMS)
  // GHI ĐÈ nội dung SAU khi trang đã tải xong → theo dõi thay đổi DOM để
  // tự gắn hiệu ứng cho nội dung mới, tránh bị "trơ" không có animation.
  // Debounce nhẹ để không quét dồn dập khi nhiều node đổi cùng lúc.
  let debounceTimer = null;
  const mo = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scan, 60);
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
