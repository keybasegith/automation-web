import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand px-4 py-2 text-white shadow-sm hover:bg-brand-hover",
  secondary:
    "border border-[var(--hairline-strong)] bg-white px-4 py-2 text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-900",
  tertiary: "px-2 py-2 text-brand hover:text-brand-hover",
  destructive: "bg-red-600 px-4 py-2 text-white shadow-sm hover:bg-red-700",
};

interface CommonProps {
  variant?: Variant;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

type ButtonLinkProps = CommonProps & { href: string };
type ButtonActionProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/**
 * Workspace button hierarchy. Navigation gets a real link: pass `href` and it
 * renders a styled next/link; otherwise it renders a true button for actions.
 */
export function Button(props: ButtonLinkProps | ButtonActionProps) {
  const classes = (variant: Variant, className: string) =>
    `${BASE} ${VARIANTS[variant]} ${className}`.trim();
  const inner = (Icon: LucideIcon | undefined, children: React.ReactNode) => (
    <>
      {Icon && <Icon aria-hidden className="h-4 w-4" />}
      {children}
    </>
  );
  if ("href" in props) {
    const { variant = "primary", icon, className = "", children, href } = props;
    return (
      <Link href={href} className={classes(variant, className)}>
        {inner(icon, children)}
      </Link>
    );
  }
  const { variant = "primary", icon, className = "", children, ...rest } = props;
  return (
    <button type="button" {...rest} className={classes(variant, className)}>
      {inner(icon, children)}
    </button>
  );
}
