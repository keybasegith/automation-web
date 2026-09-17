#!/usr/bin/env node
/**
 * Generate an INTERNAL_ADMIN_PASSWORD_HASH for the dashboard sign-in.
 *
 *   npm run auth:hash -- 'the password'
 *   npm run auth:hash            (prompts, with no echo)
 *
 * Prints the scrypt hash to copy into .env.local (or the deployment's secret
 * store). The password itself is never written to disk or to a log by this
 * script; passing it as an argument does put it in your shell history, so the
 * prompt is the better habit.
 */

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline";

const scrypt = promisify(scryptCb);

// Must stay in step with lib/content/password.ts, which verifies these hashes.
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = await scrypt(plain.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 128 * PARAMS.N * PARAMS.r * 2,
  });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Suppress echo so the password does not appear on screen.
    const onData = () => rl.output.write("");
    rl.output.write(question);
    rl.input.on("data", onData);
    rl.question("", (answer) => {
      rl.input.off("data", onData);
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    rl._writeToOutput = () => {};
  });
}

const password = process.argv[2] ?? (await prompt("Password: "));

if (!password || password.normalize("NFKC").length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

console.log("\nAdd these to .env.local (never commit them):\n");
console.log(`INTERNAL_ADMIN_EMAIL=you@keybase.com`);
console.log(`INTERNAL_ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
console.log(`AUTH_SESSION_SECRET=${randomBytes(32).toString("base64url")}\n`);
