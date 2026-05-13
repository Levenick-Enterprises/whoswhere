import { type ComponentType, type ReactNode, type SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Compact `[icon]  value` row for view-mode person/jobsite detail pages.
 * Renders as a tappable anchor when `href` is provided (used for tel: and
 * maps: links); otherwise a plain div. Icon stroke uses currentColor so the
 * theme toggle on /more just works.
 */
export function DetailIconRow({
  icon: Icon,
  href,
  label,
  children,
}: {
  icon: IconComponent;
  href?: string;
  label?: string;
  children: ReactNode;
}) {
  const rowClass = "flex items-start gap-3 rounded-lg px-3 py-2 text-base";
  const iconClass = "mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400";
  const valueClass = "min-w-0 break-words text-zinc-900 dark:text-zinc-100";

  if (href) {
    // aria-label on a link replaces the inner text for screen readers — fine
    // here because tap-to-call / tap-to-map callers pass a label that already
    // includes the value (e.g. "Call John at 555-1234").
    return (
      <a
        href={href}
        aria-label={label}
        className={`${rowClass} transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-900 dark:active:bg-zinc-800`}
      >
        <Icon className={iconClass} />
        <span className={valueClass}>{children}</span>
      </a>
    );
  }

  // Non-link variant: don't put aria-label on the wrapper — it would override
  // the visible value text. Instead render the label as an sr-only prefix so
  // screen readers hear "Position: Carpenter" without losing the value.
  return (
    <div className={rowClass}>
      <Icon className={iconClass} />
      <span className={valueClass}>
        {label && <span className="sr-only">{label}: </span>}
        {children}
      </span>
    </div>
  );
}
