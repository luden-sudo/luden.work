import { tv } from "@/lib/i18n";
// Page-shaped placeholder while data loads; the label stays available to screen readers.
export function LoadingSkeleton({ label, variant = "page" }: { label: string; variant?: "page" | "list" }) {
  return <div className={`skeleton-${variant}`} role="status" aria-busy="true">
    <span className="sr-only">{tv(label)}</span>
    {variant === "page" && <><span className="skeleton skeleton-title"/><span className="skeleton skeleton-hero"/><div className="skeleton-cards"><span className="skeleton skeleton-card"/><span className="skeleton skeleton-card"/></div></>}
    <div className="skeleton-rows">{[0, 1, 2, 3].map(row => <div className="skeleton-row" key={row}><span className="skeleton skeleton-icon"/><span className="skeleton-lines"><span className="skeleton skeleton-line"/><span className="skeleton skeleton-line short"/></span><span className="skeleton skeleton-amount"/></div>)}</div>
  </div>;
}
