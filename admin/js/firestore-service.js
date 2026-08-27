// firestore-service.js
// Lớp truy cập dữ liệu dùng chung cho mọi màn hình section (Hero, Header,
// Footer, Stats, CTA, Workflow...). Mỗi section = 1 document trong
// collection "sections", đúng mô hình đã mô tả trong báo cáo kiến trúc mục 5.

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Đọc dữ liệu 1 section, ví dụ getSection("hero")
export async function getSection(sectionId) {
  const snap = await getDoc(doc(db, "sections", sectionId));
  return snap.exists() ? snap.data() : null;
}

// Lưu dữ liệu 1 section + tự động ghi updatedAt/updatedBy + nhật ký hoạt động.
// data: object chứa các field của section (xem schema mẫu trong hero-section.js)
// user: { uid, email } của người đang thao tác (lấy từ auth-guard.requireAuth)
export async function saveSection(sectionId, data, user) {
  await setDoc(
    doc(db, "sections", sectionId),
    {
      ...data,
      status: "published",
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || "unknown",
    },
    { merge: true }
  );

  await logActivity({
    action: "update_section",
    target: sectionId,
    user,
  });
}

// Ghi 1 dòng nhật ký hoạt động — phục vụ trang "Nhật ký hoạt động" trong sidebar.
export async function logActivity({ action, target, user }) {
  await addDoc(collection(db, "activity_logs"), {
    action,
    target,
    userId: user?.uid || "unknown",
    userEmail: user?.email || "unknown",
    createdAt: serverTimestamp(),
  });
}
