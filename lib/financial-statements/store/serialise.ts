/**
 * JSON that survives bigint.
 *
 * Every monetary value in this feature is a bigint, which JSON cannot carry.
 * They are written as a tagged object and read straight back, so a stored
 * statement round-trips to the exact cent rather than through a float.
 */

const TAG = "$cents";

export const replacer = (_key: string, value: unknown): unknown =>
  typeof value === "bigint" ? { [TAG]: value.toString() } : value;

export const reviver = (_key: string, value: unknown): unknown => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 1 && keys[0] === TAG) {
      return BigInt((value as Record<string, string>)[TAG]);
    }
  }
  return value;
};

export const stringify = (value: unknown): string => JSON.stringify(value, replacer, 2);
export const parse = <T>(text: string): T => JSON.parse(text, reviver) as T;
