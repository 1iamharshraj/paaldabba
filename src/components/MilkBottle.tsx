/** A glass milk bottle whose milk level fills to `fraction` (0..1), with a gently waving surface. */
export default function MilkBottle({
  fraction,
  className = "",
}: {
  fraction: number
  className?: string
}) {
  const fill = Math.max(0, Math.min(1, fraction))
  // Bottle interior: y from 66 (neck bottom) to 244 (base). Fill from bottom up.
  const innerTop = 66
  const innerBottom = 244
  const surfaceY = innerBottom - fill * (innerBottom - innerTop)
  const id = `mb-${Math.round(fill * 1000)}`

  return (
    <svg
      viewBox="0 0 120 260"
      className={className}
      role="img"
      aria-label={`Milk bottle ${Math.round(fill * 100)}% full`}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          {/* interior of the bottle */}
          <path d="M42 62 L42 88 Q42 102 32 112 Q22 122 22 140 L22 232 Q22 246 36 246 L84 246 Q98 246 98 232 L98 140 Q98 122 88 112 Q78 102 78 88 L78 62 Z" />
        </clipPath>
        <linearGradient id={`${id}-milk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf4" />
          <stop offset="100%" stopColor="#efe4c8" />
        </linearGradient>
      </defs>

      {/* milk fill with waving surface */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y={surfaceY} width="120" height={innerBottom - surfaceY + 20} fill={`url(#${id}-milk)`} />
        {fill > 0.01 && fill < 0.99 && (
          <g className="milk-wave">
            <path
              d={`M-60 ${surfaceY} q 15 -7 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 L 300 ${surfaceY + 14} L -60 ${surfaceY + 14} Z`}
              fill="#fffdf4"
              opacity="0.9"
            />
          </g>
        )}
      </g>

      {/* glass outline */}
      <path
        d="M42 62 L42 88 Q42 102 32 112 Q22 122 22 140 L22 232 Q22 246 36 246 L84 246 Q98 246 98 232 L98 140 Q98 122 88 112 Q78 102 78 88 L78 62"
        fill="none"
        stroke="rgba(245,238,220,0.55)"
        strokeWidth="2.5"
      />
      {/* cap */}
      <rect x="38" y="40" width="44" height="22" rx="8" fill="#f5eedc" />
      <rect x="38" y="58" width="44" height="4" rx="2" fill="#d8cba8" />
      {/* glass shine */}
      <path d="M32 130 L32 224" stroke="rgba(255,255,255,0.35)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  )
}
