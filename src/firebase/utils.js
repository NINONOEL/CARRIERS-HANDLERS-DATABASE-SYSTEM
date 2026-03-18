/**
 * Firestore does not accept undefined values.
 * Removes keys with undefined value so the write does not fail.
 */
export function sanitizeForFirestore(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
