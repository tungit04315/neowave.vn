// storage-service.js
// Nén ảnh, tính hash SHA-256 để đặt tên file + khử trùng lặp,
// upload lên Cloud Storage rồi lưu metadata gọn nhẹ vào Firestore.
// (Đây là cách được khuyến nghị — xem lý do trong báo cáo kiến trúc mục 13.
// Nếu cần lưu ảnh hẳn trong Firestore theo kiểu chunk, dùng file
// firestore-image-chunking.js riêng cho trường hợp đặc biệt offline-sync.)

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { storage, db } from "./firebase-config.js";

const MAX_WIDTH = 1600;
const QUALITY = 0.8;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB, khớp với Storage rules trong báo cáo

async function resizeAndCompress(file, maxWidth = MAX_WIDTH, quality = QUALITY) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function hashBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Trả về { url, storagePath } sẵn sàng gán vào field ảnh của section.
// onProgress(message) tuỳ chọn để cập nhật UI ("Đang nén ảnh...", "Đang tải lên...").
export async function uploadImage(file, onProgress) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP).");
  }

  onProgress?.("Đang nén ảnh...");
  const blob = await resizeAndCompress(file);
  if (blob.size > MAX_FILE_BYTES) {
    throw new Error("Ảnh sau khi nén vẫn vượt quá 5MB, hãy chọn ảnh nhỏ hơn.");
  }

  onProgress?.("Đang kiểm tra trùng lặp...");
  const hash = await hashBlob(blob);
  const mediaRef = doc(db, "media", hash);
  const existing = await getDoc(mediaRef);
  if (existing.exists()) {
    onProgress?.("Đã có sẵn, dùng lại ảnh cũ.");
    return { url: existing.data().url, storagePath: existing.data().storagePath };
  }

  onProgress?.("Đang tải lên Storage...");
  const storagePath = `media/${hash}.webp`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: "image/webp" });
  const url = await getDownloadURL(storageRef);

  await setDoc(mediaRef, {
    url,
    storagePath,
    size: blob.size,
    contentType: "image/webp",
    createdAt: serverTimestamp(),
  });

  onProgress?.("Hoàn tất.");
  return { url, storagePath };
}
