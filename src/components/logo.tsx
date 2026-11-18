/** luden mark: an "l" and a dot on a blue rounded square. Decorative unless a label is given. */
export function LogoMark({ size = 32, label }: { size?: number; label?: string }) {
  return <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <rect width="64" height="64" rx="15" fill="#2457e6"/>
    <rect className="logo-mark-bar" x="20" y="13" width="9" height="38" rx="4.5" fill="#fff"/>
    <circle className="logo-mark-dot" cx="40.5" cy="45.5" r="5.5" fill="#fff"/>
  </svg>;
}

/** Mark plus wordmark. */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <span className={`logo ${className}`.trim()}><LogoMark size={size}/><span className="logo-word">luden</span></span>;
}
