// auth-guard.js
// Xử lý đăng nhập / đăng xuất và chặn truy cập các trang admin
// khi chưa đăng nhập hoặc không đúng role.

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// Gọi ở đầu mỗi trang admin (trừ login.html) để:
// 1. Chặn truy cập khi chưa đăng nhập → điều hướng về login.html
// 2. Trả về thông tin user (bao gồm role từ custom claims) cho trang dùng
//    (ví dụ hiển thị tên/role ở góc trên bên phải, ẩn menu Người dùng nếu không phải super_admin)
export function requireAuth({ onReady, loginPath = "../login.html" } = {}) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }
    const tokenResult = await user.getIdTokenResult();
    const role = tokenResult.claims.role || "editor"; // mặc định thấp nhất nếu chưa set claim
    onReady?.({ uid: user.uid, email: user.email, role });
  });
}

// Kiểm tra nhanh 1 role có đủ quyền thực hiện hành động hay không.
// Dùng trong UI để ẩn/hiện nút (KHÔNG thay thế Firestore/Storage Rules,
// việc chặn ghi thật sự luôn nằm ở rules phía server — xem báo cáo kiến trúc mục 8).
const ROLE_LEVEL = { editor: 1, admin: 2, super_admin: 3 };
export function hasRole(userRole, minRole) {
  return (ROLE_LEVEL[userRole] || 0) >= (ROLE_LEVEL[minRole] || 0);
}
