interface LogoProps {
  size?: number
  className?: string
  title?: string
}

// Inline brand mark. Gradient uses CSS variables so it tracks the user's
// selected accent color (see hooks/useTheme). The static favicon in
// /public is the same mark with fixed colors — browsers don't re-render
// tab favicons on theme change, so a constant default there is correct.
export function Logo({ size = 32, className, title = 'PCAP Replaya' }: LogoProps) {
  const gradId = `logo-bg-${size}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-500, #06b6d4)" />
          <stop offset="100%" stopColor="var(--accent-700, #0e7490)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0a0a0a" />
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
      <circle
        cx="32" cy="32" r="22"
        fill="none"
        stroke="#ffffff" strokeOpacity="0.25"
        strokeWidth="1.25" strokeDasharray="2.5 3"
      />
      <path
        d="M25 19.5 L47 32 L25 44.5 Z"
        fill="#ffffff"
        stroke="#ffffff" strokeOpacity="0.2"
        strokeLinejoin="round" strokeWidth="0.75"
      />
      <circle cx="48" cy="16" r="2.5" fill="#ffffff" />
      <circle cx="48" cy="16" r="4" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
    </svg>
  )
}
