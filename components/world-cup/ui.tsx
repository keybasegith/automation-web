// Shared UI primitives for the World Cup Challenge.
// Canada-themed palette: red #C8102E, navy #0B1F3A, light gray #F4F5F7.

import Link from "next/link";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";

export const RED = "#C8102E";
export const NAVY = "#0B1F3A";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Button -------------------------------- */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C8102E] disabled:opacity-50 disabled:pointer-events-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[#C8102E] text-white hover:bg-[#a50d26]",
  secondary: "bg-[#0B1F3A] text-white hover:bg-[#16335c]",
  outline: "border border-[#0B1F3A]/20 bg-white text-[#0B1F3A] hover:bg-gray-50",
  ghost: "text-[#0B1F3A] hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden
    />
  );
}

/* --------------------------------- Fields -------------------------------- */
function fieldClasses(invalid?: boolean): string {
  return cx(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#0B1F3A] shadow-sm outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/20 disabled:bg-gray-100 disabled:text-gray-500",
    invalid ? "border-red-400" : "border-gray-300"
  );
}

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, htmlFor, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[#0B1F3A]">
          {label}
          {required && <span className="text-[#C8102E]"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cx(fieldClasses(invalid), className)} {...rest} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldClasses(invalid), "min-h-24", className)} {...rest} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(fieldClasses(invalid), "appearance-none pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

/* --------------------------------- Badge --------------------------------- */
type BadgeTone = "red" | "navy" | "gray" | "green" | "gold" | "silver" | "bronze";

const BADGE_TONES: Record<BadgeTone, string> = {
  red: "bg-[#C8102E]/10 text-[#C8102E]",
  navy: "bg-[#0B1F3A]/10 text-[#0B1F3A]",
  gray: "bg-gray-100 text-gray-600",
  green: "bg-emerald-100 text-emerald-700",
  gold: "bg-amber-100 text-amber-800",
  silver: "bg-slate-200 text-slate-700",
  bronze: "bg-orange-100 text-orange-800",
};

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Alert --------------------------------- */
type AlertTone = "info" | "success" | "error" | "warning";

const ALERT_TONES: Record<AlertTone, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  error: "bg-red-50 text-red-800 border-red-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", ALERT_TONES[tone], className)} role="alert">
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
    </div>
  );
}

/* --------------------------------- Card ---------------------------------- */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export { cx };
