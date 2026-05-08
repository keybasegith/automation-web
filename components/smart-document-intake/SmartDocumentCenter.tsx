"use client";

import { useState } from "react";
import SmartDocumentIntake from "./SmartDocumentIntake";
import DocumentMergePanel from "./DocumentMergePanel";

type CenterTab = "separate" | "merge";

const TABS: { id: CenterTab; label: string }[] = [
  { id: "separate", label: "Separate Documents" },
  { id: "merge", label: "Merge Documents" },
];

/**
 * Two-tab container for the Smart Document Center page.
 *
 * Both panels stay mounted and use a `hidden` toggle instead of conditional
 * rendering — that way the existing intake review state (uploaded PDF,
 * classified pages, audit log entries) is preserved when the user briefly
 * switches to the Merge tab and back.
 */
export default function SmartDocumentCenter() {
  const [tab, setTab] = useState<CenterTab>("separate");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Smart document center tabs"
        className="inline-flex items-center self-start rounded-2xl bg-slate-100 p-1"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className={tab === "separate" ? "" : "hidden"}>
        <SmartDocumentIntake />
      </div>
      <div className={tab === "merge" ? "" : "hidden"}>
        <DocumentMergePanel />
      </div>
    </div>
  );
}
