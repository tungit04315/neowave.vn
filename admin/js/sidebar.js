// sidebar.js
// Sidebar dùng chung cho toàn bộ admin-cms, khớp đúng cấu trúc menu
// trong ảnh mẫu. Chỉ cần gọi renderSidebar("hero") ở mỗi trang,
// truyền đúng "key" của trang hiện tại để tô sáng menu tương ứng.

// href luôn viết theo đường dẫn TÍNH TỪ THƯ MỤC GỐC admin-cms/.
// Khi render từ pages/*.html, truyền base="../" để tự động nối đúng đường dẫn tương đối.
const MENU = [
  {
    group: "TỔNG QUAN",
    items: [{ key: "dashboard", label: "Dashboard", icon: "ti-home", href: "index.html" }],
  },
  {
    group: "WEBSITE",
    items: [
      { key: "hero", label: "Trang chủ", icon: "ti-file", href: "pages/hero.html" },
      { key: "header", label: "Header", icon: "ti-layout-navbar", href: "pages/header.html" },
      { key: "stats", label: "Thống kê", icon: "ti-chart-bar", href: "pages/stats.html" },
      { key: "cta", label: "CTA (kêu gọi hành động)", icon: "ti-bolt", href: "pages/cta.html" },
      { key: "footer", label: "Footer", icon: "ti-layout-bottombar", href: "pages/footer.html" },
      { key: "contact-widget", label: "Nút liên hệ nổi", icon: "ti-message-circle", href: "pages/contact-widget.html" },
    ],
  },
  {
    group: "NỘI DUNG",
    items: [
      { key: "services", label: "Dịch vụ", icon: "ti-briefcase", href: "pages/services.html" },
      { key: "projects", label: "Dự án", icon: "ti-folder", href: "pages/projects.html" },
      { key: "pricing", label: "Bảng giá", icon: "ti-tag", href: "pages/pricing.html" },
      { key: "workflow", label: "Quy trình", icon: "ti-git-branch", href: "pages/workflow.html" },
      { key: "blog", label: "Blog", icon: "ti-article", href: "pages/blog.html" },
      { key: "reviews", label: "Đánh giá khách hàng", icon: "ti-star", href: "pages/reviews.html" },
    ],
  },
  {
    group: "MEDIA",
    items: [{ key: "media", label: "Media Library", icon: "ti-photo", href: "pages/media.html" }],
  },
  {
    group: "LIÊN HỆ",
    items: [
      { key: "contacts", label: "Khách hàng liên hệ", icon: "ti-users", href: "pages/contacts.html" },
      { key: "contact-form", label: "Form liên hệ", icon: "ti-clipboard-list", href: "pages/contact-form.html" },
    ],
  },
  {
    group: "HỆ THỐNG",
    items: [
      { key: "users", label: "Người dùng", icon: "ti-user-circle", href: "pages/users.html" },
      { key: "logs", label: "Nhật ký hoạt động", icon: "ti-history", href: "pages/logs.html" },
      { key: "settings", label: "Cài đặt", icon: "ti-settings", href: "pages/settings.html" },
    ],
  },
];

export function renderSidebar(activeKey, base = "") {
  const container = document.getElementById("sidebar");
  if (!container) return;

  const groupsHtml = MENU.map(
    (group) => `
    <div class="mb-6">
      <p class="px-3 mb-2 text-xs font-semibold tracking-wider text-slate-400">${group.group}</p>
      <nav class="space-y-1">
        ${group.items
          .map((item) => {
            const active = item.key === activeKey;
            return `
            <a href="${base}${item.href}"
               class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                      ${active ? "bg-primary/10 text-primary font-medium" : "text-slate-600 hover:bg-slate-100"}">
              <i class="ti ${item.icon} text-lg"></i>
              <span>${item.label}</span>
            </a>`;
          })
          .join("")}
      </nav>
    </div>`
  ).join("");

  container.innerHTML = `
    <div class="flex items-center gap-2 px-3 mb-8">
      <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold">N</div>
      <div>
        <p class="font-display font-bold text-slate-900 leading-none">NEO WAVE</p>
        <p class="text-[10px] text-slate-400 tracking-wider">CMS</p>
      </div>
    </div>
    ${groupsHtml}
    <div class="mt-auto p-3 rounded-xl glass-card">
      <p class="text-sm font-medium text-slate-800 mb-1">Cần hỗ trợ?</p>
      <a href="#" class="text-xs text-primary font-medium">Tài liệu hướng dẫn →</a>
    </div>
  `;
}
