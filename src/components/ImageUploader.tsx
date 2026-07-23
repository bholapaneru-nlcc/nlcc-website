import { useState } from "react";
import { uploadImage } from "../lib/upload";
import { isFirebaseConfigured } from "../lib/firebase";

/* ----------------------------- image uploader ----------------------------- */
//
// Upload an image by file (Firebase Storage or base64 fallback) OR paste a URL.
// Used throughout the article page builder.

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

export function ImageUploader({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasImage = Boolean(value);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await uploadImage(file);
      onChange(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {label ? (
        <span className="mb-1.5 block text-[0.7rem] font-black uppercase tracking-wide text-slate-500">
          {label}
        </span>
      ) : null}

      <div className="flex gap-3">
        {/* preview */}
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
          {hasImage ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[0.65rem] font-bold text-slate-400">
              No image
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700">
            {busy ? "Uploading…" : "⬆ Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
            />
          </label>
          <input
            className={inputCls}
            value={value || ""}
            placeholder="…or paste image URL"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>

      {hasImage ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs font-bold text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline"
        >
          Remove image
        </button>
      ) : null}

      {error ? (
        <p className="mt-1.5 text-xs font-bold text-rose-600">{error}</p>
      ) : null}

      {!isFirebaseConfigured ? (
        <p className="mt-1.5 text-[0.65rem] leading-snug text-amber-600">
          Local mode: uploaded images are stored inside the article (base64).
          Add Firebase credentials to host them properly.
        </p>
      ) : null}
    </div>
  );
}
