import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { isFirebaseConfigured, storage } from "./firebase";

/* ------------------------------ image upload ------------------------------ */
//
// Upload an image file:
//   • Firebase configured -> upload to Storage, return a hosted public URL.
//   • Local mode          -> compress to a data URL (kept inside the article
//                            data). Note: localStorage is ~5MB, so for a real
//                            site with many photos, configure Firebase.

export interface UploadResult {
  url: string;
  /** "storage" = hosted on Firebase; "local" = embedded base64. */
  storage: "storage" | "local";
}

/* Compress + resize an image in the browser so that, in LOCAL mode (where it is
   stored as base64 inside localStorage, capped at ~5MB), it doesn't blow the
   quota. Resizes the longest edge down to MAX_EDGE px and re-encodes as JPEG. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === "image/png";
        try {
          resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", JPEG_QUALITY));
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<UploadResult> {
  if (isFirebaseConfigured && storage) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safe = ext.replace(/[^a-z0-9]/g, "").slice(0, 4) || "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safe}`;

    await uploadBytes(ref(storage, path), file);
    const url = await getDownloadURL(ref(storage, path));
    return { url, storage: "storage" };
  }

  // Local mode: compress first so it doesn't exhaust localStorage.
  const url = await compressToDataUrl(file);
  return { url, storage: "local" };
}

/** Upload any file (not just images) — used for homework attachments. */
export async function uploadFile(file: File): Promise<UploadResult> {
  if (isFirebaseConfigured && storage) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const safe = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safe}`;
    await uploadBytes(ref(storage, path), file);
    const url = await getDownloadURL(ref(storage, path));
    return { url, storage: "storage" };
  }
  // Local mode: for images, compress; for other files, store as data URL as-is.
  if (file.type.startsWith("image/")) {
    const url = await compressToDataUrl(file);
    return { url, storage: "local" };
  }
  const url = await fileToDataUrlRaw(file);
  return { url, storage: "local" };
}

function fileToDataUrlRaw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Does a value look like a renderable image (URL or data URL)? */
export function isImageUrl(value?: string): boolean {
  return Boolean(value && (/^https?:\/\//.test(value) || value.startsWith("data:")));
}

/** Is a file URL an image (for inline display)? */
export function isImageFile(url?: string, fileName?: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  const ext = (fileName || url).toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(ext) || /\/image\//.test(url);
}
