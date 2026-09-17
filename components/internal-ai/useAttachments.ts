"use client";

/**
 * Attachment state for the composer.
 *
 * Owns the pending files, the object URLs behind image thumbnails, and the
 * rejection messages, so the components stay presentational. Every URL this
 * hook creates is revoked by it — on removal, on clear, and on unmount — which
 * is the whole reason the previews live here rather than in the components.
 *
 * All mutation happens in event handlers, never in a state updater: creating an
 * object URL is a side effect, and an updater that React may run twice would
 * leak one each time. `live` mirrors the state so those handlers can read the
 * current list without closing over a stale render.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkAttachment,
  type AttachmentKind,
  type AttachmentLimits,
} from "@/lib/internal-ai/attachments";

export interface PendingAttachment {
  id: string;
  file: File;
  kind: AttachmentKind;
  /** Object URL for an image thumbnail; null for documents. */
  previewUrl: string | null;
}

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `att_${Math.random().toString(36).slice(2)}_${Date.now()}`;

const sumBytes = (list: readonly PendingAttachment[]): number =>
  list.reduce((sum, a) => sum + a.file.size, 0);

export interface UseAttachments {
  attachments: PendingAttachment[];
  rejections: string[];
  totalBytes: number;
  add: (files: Iterable<File>) => void;
  remove: (id: string) => void;
  /** Hands the current files to the caller and clears state, previews intact. */
  detach: () => PendingAttachment[];
  clear: () => void;
  dismissRejections: () => void;
}

export function useAttachments(limits: AttachmentLimits): UseAttachments {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);

  /** The same list, readable from handlers. Only the mutators below write it. */
  const live = useRef<PendingAttachment[]>([]);

  const commit = useCallback((next: PendingAttachment[]) => {
    live.current = next;
    setAttachments(next);
  }, []);

  // Anything still staged when the page goes away has no owner; release it.
  useEffect(
    () => () => {
      for (const attachment of live.current) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
      live.current = [];
    },
    []
  );

  const add = useCallback(
    (files: Iterable<File>) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      const accepted = [...live.current];
      const refused: string[] = [];
      let bytes = sumBytes(live.current);

      for (const file of incoming) {
        const check = checkAttachment(
          { name: file.name, mimeType: file.type, sizeBytes: file.size },
          limits,
          { count: accepted.length, bytes }
        );
        if (!check.ok) {
          refused.push(check.rejection.message);
          continue;
        }
        accepted.push({
          id: newId(),
          file,
          kind: check.kind,
          previewUrl: check.kind === "image" ? URL.createObjectURL(file) : null,
        });
        bytes += file.size;
      }

      setRejections(refused);
      if (accepted.length !== live.current.length) commit(accepted);
    },
    [commit, limits]
  );

  const remove = useCallback(
    (id: string) => {
      const target = live.current.find((a) => a.id === id);
      if (!target) return;
      if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
      commit(live.current.filter((a) => a.id !== id));
    },
    [commit]
  );

  // The transcript keeps showing these thumbnails after a send, so ownership of
  // the object URLs passes to the caller here rather than being revoked.
  const detach = useCallback((): PendingAttachment[] => {
    const current = live.current;
    commit([]);
    setRejections([]);
    return current;
  }, [commit]);

  const clear = useCallback(() => {
    for (const attachment of live.current) {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    }
    commit([]);
    setRejections([]);
  }, [commit]);

  const dismissRejections = useCallback(() => setRejections([]), []);

  return {
    attachments,
    rejections,
    totalBytes: sumBytes(attachments),
    add,
    remove,
    detach,
    clear,
    dismissRejections,
  };
}
