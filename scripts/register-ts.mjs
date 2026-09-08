/**
 * Lets the Keybase Answer commands run the project's TypeScript directly.
 *
 * Node strips types on its own; what it does not do is resolve the "@/*" alias
 * the whole repository imports through, or add a ".ts" extension to an
 * extensionless import. The resolve hook below does both, so a script can
 * import lib/keybase-answer/* exactly as the application does instead of the
 * modules being duplicated in .mjs for the sake of the command line.
 *
 * Used as: node --import ./scripts/register-ts.mjs scripts/<name>.ts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-alias-loader.mjs", pathToFileURL(`${import.meta.dirname}/`));
