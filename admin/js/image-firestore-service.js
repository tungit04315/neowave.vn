// image-firestore-service.js
// Lưu ảnh THẲNG vào Firestore dưới dạng base64 (thay cho Cloud Storage),
// theo yêu cầu: không cần cấu hình CORS/Storage Rules riêng.
//
// Giới hạn cứng của Firestore: 1 document tối đa 1.048.576 bytes (1 MiB),
// và base64 làm dữ liệu phình to thêm ~37% so với file nhị phân gốc.
// => Thuật toán bên dưới NÉN/RESIZE ảnh lặp lại nhiều bước (giảm dần kích
//    thước rồi tới chất lượng) cho đến khi chuỗi base64 đủ nhỏ để nằm gọn
//    trong 1 document, có chừa khoảng trống an toàn cho các field khác
//    (width, height, hash, createdAt...).
//
// Dữ liệu được lưu trong 1 collection RIÊNG (media_base64), KHÔNG lưu trực
// tiếp trong document "sections/hero" — hero-section.js chỉ lưu lại
// { mediaId, url } (url = base64 data URL) để trỏ tới đây, đúng mô hình
// "1 nơi lưu ảnh dùng chung, nhiều section trỏ tới".

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Firestore giới hạn 1 document ~1.048.576 bytes. Để an toàn cho các field
// khác (hash, width, height, timestamps...) và tránh sát mép giới hạn,
// ta chỉ cho phép chuỗi base64 tối đa ~700KB (đã bao gồm phần "data:...;base64,").
const MAX_DOC_BASE64_BYTES = 700 * 1024;

// Các mức thử giảm dần: chiều rộng tối đa -> chất lượng nén.
// Thuật toán thử theo thứ tự cho tới khi vừa MAX_DOC_BASE64_BYTES,
// càng về sau ảnh càng nhỏ/nén càng mạnh.
const COMPRESSION_STEPS = [
    { maxWidth: 1200, quality: 0.8 },
    { maxWidth: 1200, quality: 0.6 },
    { maxWidth: 900, quality: 0.6 },
    { maxWidth: 900, quality: 0.45 },
    { maxWidth: 700, quality: 0.45 },
    { maxWidth: 500, quality: 0.4 },
    { maxWidth: 360, quality: 0.35 },
];

async function loadBitmap(file) {
    return await createImageBitmap(file);
}

async function resizeAndCompress(bitmap, maxWidth, quality) {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    return { blob, width: canvas.width, height: canvas.height };
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // "data:image/webp;base64,...."
        reader.onerror = () => reject(new Error("Không đọc được dữ liệu ảnh."));
        reader.readAsDataURL(blob);
    });
}

async function hashBlob(blob) {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Băm nhỏ ảnh dần theo COMPRESSION_STEPS cho tới khi base64 đủ nhỏ để
// chứa trong 1 Firestore document. Ném lỗi nếu không có bước nào đạt.
async function compressUntilFits(file, onProgress) {
    const bitmap = await loadBitmap(file);

    for (const [i, step] of COMPRESSION_STEPS.entries()) {
        onProgress?.(`Đang nén ảnh (bước ${i + 1}/${COMPRESSION_STEPS.length})...`);
        const { blob, width, height } = await resizeAndCompress(bitmap, step.maxWidth, step.quality);
        const dataUrl = await blobToBase64(blob);

        if (dataUrl.length <= MAX_DOC_BASE64_BYTES) {
            return { blob, dataUrl, width, height };
        }
        // Chưa đủ nhỏ -> thử bước tiếp theo (nhỏ hơn/nén mạnh hơn).
    }

    throw new Error(
        "Ảnh quá lớn/chi tiết, không thể nén đủ nhỏ để lưu trong Firestore (giới hạn ~700KB sau khi mã hoá base64). Vui lòng chọn ảnh khác hoặc ảnh có ít chi tiết hơn."
    );
}

// Trả về { url, mediaId } — url là base64 data URL, dùng thẳng làm src="".
// mediaId là hash SHA-256, dùng làm id document trong collection media_base64
// (đồng thời khử trùng lặp: ảnh giống hệt sẽ tái dùng document cũ).
export async function uploadImageToFirestore(file, onProgress) {
    if (!file.type.startsWith("image/")) {
        throw new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP).");
    }

    const { blob, dataUrl, width, height } = await compressUntilFits(file, onProgress);

    onProgress?.("Đang kiểm tra trùng lặp...");
    const hash = await hashBlob(blob);
    const mediaRef = doc(db, "media_base64", hash);
    const existing = await getDoc(mediaRef);
    if (existing.exists()) {
        onProgress?.("Đã có sẵn, dùng lại ảnh cũ.");
        return { url: existing.data().dataUrl, mediaId: hash };
    }

    onProgress?.("Đang lưu vào Firestore...");
    await setDoc(mediaRef, {
        dataUrl,
        width,
        height,
        size: dataUrl.length,
        contentType: "image/webp",
        createdAt: serverTimestamp(),
    });

    onProgress?.("Hoàn tất.");
    return { url: dataUrl, mediaId: hash };
}

// Cho phép các trang khác (ví dụ trang chủ public) chỉ có mediaId (không có
// sẵn base64) tự lấy lại ảnh từ collection media_base64.
export async function getImageById(mediaId) {
    if (!mediaId) return null;
    const snap = await getDoc(doc(db, "media_base64", mediaId));
    return snap.exists() ? snap.data().dataUrl : null;
}