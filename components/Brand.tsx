export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="#1D1D1F" strokeWidth="2" />
      {/* vague */}
      <path
        d="M8 30c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3"
        stroke="#1D1D1F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* pinces / homard stylisé */}
      <path
        d="M18 20c-2-3-6-3-7-1M30 20c2-3 6-3 7-1"
        stroke="#1D1D1F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="18" r="3" fill="#1D1D1F" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={compact ? 30 : 38} />
      <div className="leading-tight">
        <div className="display text-[17px] font-semibold tracking-tighter text-encre">
          CAP HOMARD
        </div>
        {!compact && (
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ardoise">
            Beach Volley · 974
          </div>
        )}
      </div>
    </div>
  );
}
