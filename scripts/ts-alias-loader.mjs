/**
 * Module resolution for the Keybase Answer commands. See ./register-ts.mjs.
 *
 * Mirrors the two rules tsconfig.json and the bundler apply:
 *   - "@/x"         -> <project root>/x
 *   - extensionless -> try .ts, then .tsx, then /index.ts
 *
 * Nothing else is changed; anything this cannot place is handed straight back
 * to Node's own resolver, so npm packages resolve normally.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isFile(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function firstExisting(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find(isFile) ?? null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const found = firstExisting(path.join(root, specifier.slice(2)));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const found = firstExisting(path.resolve(parent, specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
