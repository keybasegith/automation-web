"use client";

import { useState } from "react";
import { X, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  defaultEmployeeName?: string;
  onCancel: () => void;
  onConfirm: (args: { employeeName: string; pin: string }) => void;
}

export default function ApprovalPinModal(props: Props) {
  if (!props.open) return null;
  // Mount a fresh inner component each time the modal opens so its local
  // state (PIN, errors) is reset without using a side effect.
  return <ApprovalPinModalInner {...props} />;
}

function ApprovalPinModalInner({
  defaultEmployeeName,
  onCancel,
  onConfirm,
}: Props) {
  const [employeeName, setEmployeeName] = useState(defaultEmployeeName ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    if (!employeeName.trim()) {
      setError("Please enter your employee name.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4 to 6 digits.");
      return;
    }
    onConfirm({ employeeName: employeeName.trim(), pin });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Approval Required
              </h3>
              <p className="text-xs text-slate-500">
                Enter your employee PIN to confirm that you reviewed the
                document split.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              Employee Name
            </span>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Your full name"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4–6 digits"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm tracking-[0.3em] text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <span className="text-[11px] text-slate-500">
              For MVP, any 4–6 digit numeric PIN is accepted. Do not share real
              employee PINs in this environment.
            </span>
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            Confirm & Finalize
          </button>
        </div>
      </div>
    </div>
  );
}
