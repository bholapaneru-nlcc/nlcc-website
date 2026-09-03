/* ----------------------- firestore data sanitiser ------------------------- */
//
// Firestore's client SDK REJECTS any document containing `undefined` values
// with an error like: "Unsupported field value: undefined".
//
// Block data from the builder often has optional properties that are undefined
// (e.g. `color`, `imgWidth`, `shapeGap` when not explicitly set). This function
// recursively removes all `undefined` values from an object so it can be safely
// written to Firestore.

export function cleanForFirestore<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(cleanForFirestore) as unknown as T;
  if (typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as unknown as T;
  }
  return value;
}
