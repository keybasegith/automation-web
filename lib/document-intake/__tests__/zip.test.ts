import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocumentFolders, buildZipFileName } from "../folders";
import type { SeparatedDocumentFile } from "../types";
import { createZip, crc32, sanitizeFolderName } from "../zip";

const encode = (s: string) => new TextEncoder().encode(s);

/**
 * The archive-validity tests shell out to `unzip` so a real extractor checks
 * our headers and CRCs. Skip rather than fail where it isn't installed.
 */
const hasUnzip = (() => {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

async function writeZip(blob: Blob): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "intake-zip-"));
  const path = join(dir, "out.zip");
  writeFileSync(path, new Uint8Array(await blob.arrayBuffer()));
  return path;
}

describe("crc32", () => {
  it("matches the standard check value", () => {
    // The canonical CRC-32 test vector.
    expect(crc32(encode("123456789"))).toBe(0xcbf43926);
  });

  it("is zero for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("createZip", () => {
  it.runIf(hasUnzip)("produces an archive the system unzip accepts", async () => {
    const blob = createZip([
      { path: "KYC Update/first.txt", bytes: encode("hello kyc") },
      { path: "KYC Update/second.txt", bytes: encode("second file") },
      { path: "Order Request AIO/order.txt", bytes: encode("an order") },
    ]);
    const path = await writeZip(blob);

    // `unzip -t` verifies every entry's CRC against its stored data, so this
    // catches header/offset mistakes that a hand-rolled parser would miss.
    const test = execFileSync("unzip", ["-t", path], { encoding: "utf8" });
    expect(test).toMatch(/No errors detected/);
  });

  it.runIf(hasUnzip)("round-trips folder structure and content", async () => {
    const blob = createZip([
      { path: "KYC Update/first.txt", bytes: encode("hello kyc") },
      { path: "Order Request AIO/order.txt", bytes: encode("an order") },
    ]);
    const path = await writeZip(blob);
    const dest = mkdtempSync(join(tmpdir(), "intake-unzip-"));
    execFileSync("unzip", ["-q", path, "-d", dest]);

    expect(readFileSync(join(dest, "KYC Update", "first.txt"), "utf8")).toBe(
      "hello kyc"
    );
    expect(
      readFileSync(join(dest, "Order Request AIO", "order.txt"), "utf8")
    ).toBe("an order");
  });

  it.runIf(hasUnzip)("handles binary content and an empty archive", async () => {
    const binary = new Uint8Array(1024);
    for (let i = 0; i < binary.length; i++) binary[i] = (i * 31) % 256;

    const path = await writeZip(createZip([{ path: "blob.bin", bytes: binary }]));
    execFileSync("unzip", ["-t", path]);

    const empty = createZip([]);
    expect(empty.size).toBe(22); // just the end-of-central-directory record
  });

  it.runIf(hasUnzip)("stores non-ASCII names as flagged UTF-8", async () => {
    // Asserted against the archive bytes rather than `unzip -l`: the Info-ZIP
    // build macOS ships transliterates UTF-8 names in its listing output even
    // though it extracts them correctly.
    const name = "Émilie Côté/relevé.txt";
    const blob = createZip([{ path: name, bytes: encode("ok") }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // The name is present verbatim as UTF-8...
    const encoded = encode(name);
    const haystack = Array.from(bytes).join(",");
    expect(haystack).toContain(Array.from(encoded).join(","));

    // ...and bit 11 of the local header's general-purpose flags says so, which
    // is what tells the extractor to decode it as UTF-8 rather than CP437.
    const flags = new DataView(bytes.buffer).getUint16(6, true);
    expect(flags & 0x0800).toBe(0x0800);

    const path = await writeZip(blob);
    expect(
      execFileSync("unzip", ["-t", path], { encoding: "utf8" })
    ).toMatch(/No errors detected/);
  });
});

describe("sanitizeFolderName", () => {
  it("strips path separators so a name cannot add a directory level", () => {
    expect(sanitizeFolderName("Order / PAC Request AIO 1st Plan - 10099")).toBe(
      "Order PAC Request AIO 1st Plan - 10099"
    );
  });

  it("strips characters that are illegal on Windows", () => {
    expect(sanitizeFolderName('KYC: "Update" <3>')).toBe("KYC Update 3");
    expect(sanitizeFolderName("Trailing dots...")).toBe("Trailing dots");
  });

  it("falls back for an empty name", () => {
    expect(sanitizeFolderName("   ")).toBe("Unsorted");
    expect(sanitizeFolderName("///")).toBe("Unsorted");
  });
});

function file(
  id: string,
  documentName: string,
  category: string
): SeparatedDocumentFile {
  return {
    id,
    fileName: `${id}.pdf`,
    documentName,
    category,
    documentType: "Other",
    startPage: 1,
    endPage: 2,
    pageCount: 2,
    blobUrl: `blob:${id}`,
    status: "Ready",
  };
}

describe("buildDocumentFolders", () => {
  it("puts every copy of one document type in a single folder", () => {
    const folders = buildDocumentFolders([
      file("a", "Order / PAC Request AIO 1st Plan - 10099", "Keybase Trading"),
      file("b", "KYC Update - 3 Pages - 10001", "Keybase Know Your Client KYC"),
      file("c", "Order / PAC Request AIO 1st Plan - 10099", "Keybase Trading"),
    ]);

    expect(folders).toHaveLength(2);
    // Source order preserved.
    expect(folders[0].folderName).toBe(
      "Order PAC Request AIO 1st Plan - 10099"
    );
    expect(folders[0].files.map((f) => f.id)).toEqual(["a", "c"]);
    expect(folders[1].files.map((f) => f.id)).toEqual(["b"]);
  });

  it("returns nothing for no files", () => {
    expect(buildDocumentFolders([])).toEqual([]);
  });
});

describe("buildZipFileName", () => {
  it("names the per-folder and combined archives", () => {
    expect(
      buildZipFileName({ clientName: "Jane Smith", folderName: "KYC Update" })
    ).toBe("Jane Smith - KYC Update.zip");
    expect(buildZipFileName({ clientName: "Jane Smith" })).toBe(
      "Jane Smith - Separated Documents.zip"
    );
    expect(buildZipFileName({ clientName: "" })).toBe(
      "Client - Separated Documents.zip"
    );
  });
});
