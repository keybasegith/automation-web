import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  CmsAuditEntry,
  CmsDoc,
  CmsResource,
  MediaItem,
} from "@/lib/cms/types";
import type { CmsBackend } from "@/lib/cms/storage/backend";

/**
 * File-backed CMS storage — local development only (CMS_STORE=file).
 *
 * Documents live in `data/cms/<resource>.json`, the audit log in
 * `data/cms-audit.json`, and media metadata in `data/cms-media.json`. Writes
 * are atomic (temp file + rename) so a crash mid-write can never corrupt the
 * content. Unsuitable for serverless deployments, where the filesystem is
 * read-only and reset on every deploy.
 */

/** Root for runtime data. Override with CMS_DATA_DIR (used by tests). */
function dataDir(): string {
  return process.env.CMS_DATA_DIR ?? path.join(process.cwd(), "data");
}

const AUDIT_MAX_ENTRIES = 500;

async function atomicWrite(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null; // Missing or unreadable → treated as "not written yet".
  }
}

export class FileBackend implements CmsBackend {
  private docFile(resource: CmsResource): string {
    return path.join(dataDir(), "cms", `${resource}.json`);
  }
  private auditFile(): string {
    return path.join(dataDir(), "cms-audit.json");
  }
  private mediaFile(): string {
    return path.join(dataDir(), "cms-media.json");
  }

  async loadDoc(resource: CmsResource): Promise<CmsDoc<unknown> | null> {
    const parsed = await readJson<CmsDoc<unknown>>(this.docFile(resource));
    if (parsed && typeof parsed === "object" && "draft" in parsed) return parsed;
    return null;
  }

  async saveDoc(doc: CmsDoc<unknown>): Promise<void> {
    await atomicWrite(this.docFile(doc.resource), doc);
  }

  async appendAudit(entry: CmsAuditEntry): Promise<void> {
    const all = (await readJson<CmsAuditEntry[]>(this.auditFile())) ?? [];
    const rows = Array.isArray(all) ? all : [];
    await atomicWrite(
      this.auditFile(),
      [entry, ...rows].slice(0, AUDIT_MAX_ENTRIES)
    );
  }

  async listAudit(limit: number): Promise<CmsAuditEntry[]> {
    const all = (await readJson<CmsAuditEntry[]>(this.auditFile())) ?? [];
    return (Array.isArray(all) ? all : []).slice(0, limit);
  }

  private async readMediaIndex(): Promise<MediaItem[]> {
    const all = (await readJson<MediaItem[]>(this.mediaFile())) ?? [];
    return Array.isArray(all) ? all : [];
  }

  async listMedia(): Promise<MediaItem[]> {
    const items = await this.readMediaIndex();
    return items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  }

  async getMedia(id: string): Promise<MediaItem | null> {
    return (await this.readMediaIndex()).find((m) => m.id === id) ?? null;
  }

  async insertMedia(item: MediaItem): Promise<void> {
    const items = await this.readMediaIndex();
    await atomicWrite(this.mediaFile(), [item, ...items]);
  }

  async updateMedia(item: MediaItem): Promise<void> {
    const items = await this.readMediaIndex();
    const idx = items.findIndex((m) => m.id === item.id);
    if (idx === -1) return;
    items[idx] = item;
    await atomicWrite(this.mediaFile(), items);
  }

  async deleteMedia(id: string): Promise<void> {
    const items = await this.readMediaIndex();
    await atomicWrite(
      this.mediaFile(),
      items.filter((m) => m.id !== id)
    );
  }
}
