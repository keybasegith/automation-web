"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kb-content-calendar-actor";

/**
 * Who is using the calendar right now.
 *
 * The dashboard has one shared internal login, so the session cannot say
 * whether this is the manager or an intern — and a history that credits every
 * approval to "Admin" would be worthless. The name is asked for once and kept
 * in this browser; it is a label on the history, never a credential, and
 * nothing is authorized by it.
 */
export function useActorName(): {
  actorName: string;
  setActorName: (name: string) => void;
  /** False until localStorage has been read, so the prompt does not flash. */
  ready: boolean;
} {
  const [actorName, setName] = useState("");
  const [ready, setReady] = useState(false);

  // Read after mount, not in a lazy initialiser: localStorage does not exist
  // during the server render, and a value read only on the client would not
  // match the markup React hydrates against.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(window.localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      /* private mode, or storage disabled: fall back to asking each session */
    }
    setReady(true);
  }, []);

  const setActorName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 60);
    setName(trimmed);
    try {
      if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* the name still works for this page load */
    }
  }, []);

  return { actorName, setActorName, ready };
}
