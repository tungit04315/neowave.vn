// firebase-config.js
// ⚠️ Đây là cấu hình DEMO. Trước khi dùng thật, thay 6 giá trị bên dưới
// bằng config lấy từ Firebase Console → Project settings → General → Your apps.
// Toàn bộ code còn lại trong admin-cms/ và public-site/ KHÔNG cần đổi gì thêm.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  enableMultiTabIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcBMBqFfCf89UM75U7yYFbqVrOuFxOYwc",
  authDomain: "neowavevn-352de.firebaseapp.com",
  projectId: "neowavevn-352de",
  storageBucket: "neowavevn-352de.firebasestorage.app",
  messagingSenderId: "194959832007",
  appId: "1:194959832007:web:ec8ca1aad53aa9627ddfe2",
  measurementId: "G-3GQH0XEX72"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Bật cache offline cho Firestore (đọc/ghi vẫn hoạt động khi mất mạng,
// đồng bộ lại khi có mạng trở lại). Dùng bản MULTI-TAB để nhiều tab cùng
// origin (VD: vừa mở admin-cms vừa mở trang chủ, hoặc mở lại nhiều lần
// trong công cụ preview/devtools) có thể chia sẻ chung persistence layer
// thay vì tranh nhau quyền độc quyền (single-tab) gây lỗi
// "Failed to obtain exclusive access" / "INTERNAL ASSERTION FAILED".
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.warn("Không bật được Firestore offline persistence:", err.code);
});
