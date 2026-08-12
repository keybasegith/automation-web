/**
 * Minimal ZIP writer, used to hand the employee one archive per document
 * folder instead of N separate browser downloads.
 *
 * Entries are STORED, not deflated. Every file we put in here is already a
 * compressed PDF, so deflate would cost CPU for ~0% saving — and storing lets
 * this stay dependency-free and synchronous.
 *
 * Folders are expressed as `/` in entry names, which every extractor
 * (Finder, Windows Explorer, unzip, 7-Zip) materialises as real directories.
 */

export interface ZipEntry {
  /** Entry path inside the archive, e.g. "KYC Update/Smith_KYC.pdf". */
  path: string;
  bytes: Uint8Array;
}

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;

/** Version 2.0 — the minimum that covers directories and stored entries. */
const VERSION = 20;
/** Bit 11: the filename is UTF-8. Lets non-ASCII client names survive. */
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;

let crcTable: Uint32Array | undefined;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Convert a Date into the packed MS-DOS time/date pair ZIP uses.
 * DOS dates start at 1980 and store seconds in 2-second units.
 */
function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (Math.floor(date.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Little-endian writer over a fixed-size buffer. */
class ByteWriter {
  private readonly view: DataView;
  private offset = 0;

  constructor(readonly buffer: Uint8Array) {
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  raw(bytes: Uint8Array): void {
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }
}

/**
 * Build a ZIP archive from the given entries.
 *
 * Entry order is preserved. Duplicate paths are the caller's problem — the
 * download UI de-duplicates names before it gets here.
 */
export function createZip(
  entries: ZipEntry[],
  opts?: { modifiedAt?: Date }
): Blob {
  const encoder = new TextEncoder();
  const modified = toDosDateTime(opts?.modifiedAt ?? new Date());

  const prepared = entries.map((entry) => {
    const nameBytes = encoder.encode(entry.path);
    return {
      nameBytes,
      bytes: entry.bytes,
      crc: crc32(entry.bytes),
      // Filled in as we lay the archive out.
      localOffset: 0,
    };
  });

  // Pre-compute the exact archive size so we can write into one buffer.
  const LOCAL_HEADER_SIZE = 30;
  const CENTRAL_HEADER_SIZE = 46;
  const END_RECORD_SIZE = 22;

  let localSectionSize = 0;
  let centralSectionSize = 0;
  for (const p of prepared) {
    localSectionSize += LOCAL_HEADER_SIZE + p.nameBytes.length + p.bytes.length;
    centralSectionSize += CENTRAL_HEADER_SIZE + p.nameBytes.length;
  }

  const out = new Uint8Array(
    localSectionSize + centralSectionSize + END_RECORD_SIZE
  );
  const writer = new ByteWriter(out);

  // ---- local file headers + data ----
  let offset = 0;
  for (const p of prepared) {
    p.localOffset = offset;
    writer.u32(LOCAL_HEADER_SIG);
    writer.u16(VERSION);
    writer.u16(FLAG_UTF8);
    writer.u16(METHOD_STORE);
    writer.u16(modified.time);
    writer.u16(modified.date);
    writer.u32(p.crc);
    writer.u32(p.bytes.length); // compressed == uncompressed when stored
    writer.u32(p.bytes.length);
    writer.u16(p.nameBytes.length);
    writer.u16(0); // extra field length
    writer.raw(p.nameBytes);
    writer.raw(p.bytes);
    offset += LOCAL_HEADER_SIZE + p.nameBytes.length + p.bytes.length;
  }

  // ---- central directory ----
  const centralDirOffset = offset;
  for (const p of prepared) {
    writer.u32(CENTRAL_HEADER_SIG);
    writer.u16(VERSION); // version made by
    writer.u16(VERSION); // version needed to extract
    writer.u16(FLAG_UTF8);
    writer.u16(METHOD_STORE);
    writer.u16(modified.time);
    writer.u16(modified.date);
    writer.u32(p.crc);
    writer.u32(p.bytes.length);
    writer.u32(p.bytes.length);
    writer.u16(p.nameBytes.length);
    writer.u16(0); // extra field length
    writer.u16(0); // file comment length
    writer.u16(0); // disk number start
    writer.u16(0); // internal file attributes
    writer.u32(0); // external file attributes
    writer.u32(p.localOffset);
    writer.raw(p.nameBytes);
  }

  // ---- end of central directory ----
  writer.u32(END_OF_CENTRAL_DIR_SIG);
  writer.u16(0); // this disk number
  writer.u16(0); // disk with the central directory
  writer.u16(prepared.length); // entries on this disk
  writer.u16(prepared.length); // entries total
  writer.u32(centralSectionSize);
  writer.u32(centralDirOffset);
  writer.u16(0); // archive comment length

  return new Blob([out as unknown as BlobPart], { type: "application/zip" });
}

/**
 * Strip characters that are illegal in a folder name on common filesystems.
 * Unlike `sanitizeFileName` this also removes `/` so a document name can
 * never inject an extra directory level into the archive.
 */
export function sanitizeFolderName(raw: string): string {
  const out = (raw ?? "")
    .replace(/[/\\:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Trailing dots break folder creation on Windows.
    .replace(/\.+$/, "")
    .trim();
  return out.length > 0 ? out : "Unsorted";
}
