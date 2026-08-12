"use client";

import {
  Download,
  FileCheck2,
  FolderArchive,
  Loader2,
  RotateCcw,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDocumentFolders,
  buildZipFileName,
  zipAllFolders,
  zipFolder,
  type DocumentFolder,
} from "@/lib/document-intake/folders";
import {
  DEFAULT_FILENAME_TEMPLATE,
  renderFilenameTemplate,
} from "@/lib/document-intake/groupPages";
import { sanitizeFileName } from "@/lib/document-intake/splitPdf";
import type {
  DocumentGroup,
  SeparatedDocumentFile,
} from "@/lib/document-intake/types";
import IntakeStatusBadge from "./IntakeStatusBadge";

interface Props {
  files: SeparatedDocumentFile[];
  /** Source-of-truth groups (used for re-rendering filenames from a template). */
  groups: DocumentGroup[];
  clientName: string;
  clientId?: string;
  advisorName?: string;
  /**
   * Called when the employee edits a single filename. The orchestrator owns
   * the audit trail and persists the change back to the SeparatedDocumentFile.
   */
  onFileNameChange: (fileId: string, newName: string) => void;
  /** Reset all final filenames to their original suggested values. */
  onResetAll: () => void;
  /** Apply a template to ALL files at once. */
  onApplyTemplate: (template: string, autoFormat: boolean) => void;
  /** Audit log hook for downloads. */
  onLogDownload: (kind: "all" | "selected", count: number) => void;
}

function describePages(file: SeparatedDocumentFile): string {
  return file.startPage === file.endPage
    ? `Page ${file.startPage}`
    : `Pages ${file.startPage}–${file.endPage}`;
}

function findDuplicates(files: SeparatedDocumentFile[]): Set<string> {
  const counts = new Map<string, number>();
  for (const f of files) {
    const key = sanitizeFileName(f.fileName).toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k));
}

function triggerBrowserDownload(blobUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Download a generated Blob, revoking the temporary URL afterwards. */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, fileName);
  // Give the click a tick to be handled before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function SplitResults({
  files,
  groups,
  clientName,
  clientId,
  advisorName,
  onFileNameChange,
  onResetAll,
  onApplyTemplate,
  onLogDownload,
}: Props) {
  const [template, setTemplate] = useState(DEFAULT_FILENAME_TEMPLATE);
  const [autoFormat, setAutoFormat] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Key of the folder currently being zipped, or "__all__". */
  const [zipping, setZipping] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  // Reset selection when the file set changes (e.g. a new run finalizes).
  const fileIdsKey = files.map((f) => f.id).join("|");
  const previousKey = useRef<string>("");
  useEffect(() => {
    if (previousKey.current !== fileIdsKey) {
      previousKey.current = fileIdsKey;
      setSelected(new Set(files.map((f) => f.id)));
    }
  }, [fileIdsKey, files]);

  const duplicateKeys = useMemo(() => findDuplicates(files), [files]);
  const folders = useMemo(() => buildDocumentFolders(files), [files]);

  const previewTemplate = (file: SeparatedDocumentFile): string => {
    const group = groups.find((g) => g.id === file.id);
    if (!group) return file.fileName;
    return renderFilenameTemplate(
      template,
      {
        clientName: clientName || "Client",
        clientId,
        advisorName,
        documentName: group.documentName,
        documentCode: group.documentCode,
        category: group.category,
        startPage: group.startPage,
        endPage: group.endPage,
        date: new Date().toISOString().slice(0, 10),
      },
      { autoFormat }
    );
  };

  const downloadSelected = () => {
    const list = files.filter((f) => selected.has(f.id));
    list.forEach((f) =>
      triggerBrowserDownload(f.blobUrl, sanitizeFileName(f.fileName))
    );
    onLogDownload("selected", list.length);
  };

  const downloadFolder = async (folder: DocumentFolder) => {
    setZipError(null);
    setZipping(folder.key);
    try {
      const blob = await zipFolder(folder);
      downloadBlob(
        blob,
        buildZipFileName({ clientName, folderName: folder.folderName })
      );
      onLogDownload("selected", folder.files.length);
    } catch (err) {
      setZipError(
        `Could not build the archive for "${folder.folderName}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setZipping(null);
    }
  };

  const downloadAllFolders = async () => {
    setZipError(null);
    setZipping("__all__");
    try {
      const blob = await zipAllFolders(folders);
      downloadBlob(blob, buildZipFileName({ clientName }));
      onLogDownload("all", files.length);
    } catch (err) {
      setZipError(
        `Could not build the archive: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setZipping(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = files.length > 0 && selected.size === files.length;
  const toggleAllSelected = () => {
    setSelected(allSelected ? new Set() : new Set(files.map((f) => f.id)));
  };

  const toggleFolderSelected = (folder: DocumentFolder) => {
    const ids = folder.files.map((f) => f.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  if (files.length === 0) return null;

  const busy = zipping !== null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <FileCheck2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-emerald-900">
            Separated Documents Created
          </h3>
          <p className="mt-1 text-sm text-emerald-800">
            Each document type has its own folder. Download a single folder to
            get just that document, or download everything as one organized
            archive. You can edit the final download file names first — useful
            when the name has to match Wconnect, WindFund, advisor records, or
            another internal naming convention.
          </p>
          <p className="mt-1 text-xs italic text-emerald-700">
            {/* TODO: persist to Supabase storage once an intake bucket exists. */}
            TODO: persist to a secure storage bucket (Supabase) in a future
            iteration.
          </p>
        </div>
      </div>

      {/* Template / batch controls */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-[280px]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-700">
                File Naming Template
              </span>
              <input
                type="text"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <p className="mt-1 text-[11px] text-slate-500">
              Variables: {`{clientName}, {clientId}, {advisorName}, {documentName}, {documentCode}, {category}, {startPage}, {endPage}, {date}`}.
              Empty variables collapse cleanly.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={autoFormat}
              onChange={(e) => setAutoFormat(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Auto-format (replace spaces with _)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApplyTemplate(template, autoFormat)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-medium text-white transition hover:bg-brand-hover"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Apply Template to All
            </button>
            <button
              type="button"
              onClick={() => onApplyTemplate(DEFAULT_FILENAME_TEMPLATE, true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Auto-name All
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Names
            </button>
          </div>
        </div>
      </div>

      {duplicateKeys.size > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Duplicate file names detected. Each file must have a unique name
            before downloading individually. (Archives stay safe — colliding
            names are numbered automatically inside the .zip.)
          </span>
        </div>
      )}

      {zipError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{zipError}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAllSelected}
            className="h-4 w-4 rounded border-slate-300"
          />
          Select all {files.length} document{files.length === 1 ? "" : "s"}
        </label>
        <p className="text-xs text-slate-500">
          {folders.length} folder{folders.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-2 space-y-4">
        {folders.map((folder) => {
          const folderIds = folder.files.map((f) => f.id);
          const folderAllSelected = folderIds.every((id) => selected.has(id));
          const pageCount = folder.files.reduce(
            (sum, f) => sum + f.pageCount,
            0
          );
          return (
            <div
              key={folder.key}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={folderAllSelected}
                    onChange={() => toggleFolderSelected(folder)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <FolderArchive className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {folder.folderName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {folder.category} · {folder.files.length} file
                      {folder.files.length === 1 ? "" : "s"} · {pageCount} page
                      {pageCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFolder(folder)}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {zipping === folder.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download Folder (.zip)
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-2" />
                    <th className="px-4 py-2 font-semibold">Pages</th>
                    <th className="px-4 py-2 font-semibold">
                      Suggested File Name
                    </th>
                    <th className="px-4 py-2 font-semibold">
                      Final Download File Name
                    </th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {folder.files.map((f) => {
                    const sanitized = sanitizeFileName(f.fileName);
                    const isDuplicate = duplicateKeys.has(
                      sanitized.toLowerCase()
                    );
                    const templatePreview = previewTemplate(f);
                    return (
                      <tr key={f.id}>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selected.has(f.id)}
                            onChange={() => toggleSelected(f.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {describePages(f)}
                          {f.documentCode && (
                            <p className="font-mono text-[11px] text-slate-500">
                              Code {f.documentCode}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="break-all font-mono text-[11px] text-slate-500">
                            {/* When the template differs from the suggested name
                                we show the template-based preview alongside. */}
                            {templatePreview === sanitized
                              ? "(matches current)"
                              : templatePreview}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="text"
                            value={f.fileName}
                            onChange={(e) =>
                              onFileNameChange(f.id, e.target.value)
                            }
                            className={`h-9 w-full min-w-[260px] rounded-lg border bg-white px-2 font-mono text-xs text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                              isDuplicate
                                ? "border-red-300 bg-red-50"
                                : "border-slate-200"
                            }`}
                          />
                          {isDuplicate && (
                            <p className="mt-1 text-[11px] text-red-700">
                              Duplicate file name
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <IntakeStatusBadge status={f.status} />
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => {
                              triggerBrowserDownload(f.blobUrl, sanitized);
                              onLogDownload("selected", 1);
                            }}
                            disabled={isDuplicate || sanitized === ".pdf"}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={downloadSelected}
          disabled={selected.size === 0 || duplicateKeys.size > 0 || busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Download Selected as PDFs ({selected.size})
        </button>
        <button
          type="button"
          onClick={downloadAllFolders}
          disabled={busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {zipping === "__all__" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FolderArchive className="h-3.5 w-3.5" />
          )}
          Download All Folders (.zip)
        </button>
      </div>
    </section>
  );
}
