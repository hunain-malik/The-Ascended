/**
 * Atmospheric SVG/CSS layer — drifting aurora orbs, slow pulse,
 * faint dust. Sits behind page content with z-index handled by parent.
 * No external assets, no real photos.
 */
export default function AmbientBackdrop({ intensity = 1 }: { intensity?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Aurora orb 1 — crimson, drifts */}
      <div
        className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full animate-drift"
        style={{
          background: 'radial-gradient(closest-side, rgba(185,28,28,0.35), rgba(185,28,28,0) 70%)',
          filter: 'blur(40px)',
          opacity: 0.7 * intensity,
        }}
      />
      {/* Aurora orb 2 — burgundy, drifts opposite */}
      <div
        className="absolute -bottom-1/3 -right-1/4 w-[90vw] h-[90vw] rounded-full animate-driftAlt"
        style={{
          background: 'radial-gradient(closest-side, rgba(127,29,29,0.4), rgba(58,12,12,0) 70%)',
          filter: 'blur(50px)',
          opacity: 0.65 * intensity,
        }}
      />
      {/* Aurora orb 3 — warm bone glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40vw] h-[40vw] rounded-full animate-slowPulse"
        style={{
          background: 'radial-gradient(closest-side, rgba(189,161,119,0.18), rgba(189,161,119,0) 70%)',
          filter: 'blur(60px)',
          opacity: 0.55 * intensity,
        }}
      />

      {/* Dust grain */}
      <Dust />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  );
}

function Dust() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.18] mix-blend-screen"
      preserveAspectRatio="none"
      viewBox="0 0 800 800"
    >
      <defs>
        <radialGradient id="dustDot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbf6ef" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fbf6ef" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 60 }).map((_, i) => {
        const cx = (i * 73) % 800;
        const cy = (i * 131) % 800;
        const r = 1 + ((i * 7) % 4) / 2;
        const dur = 8 + (i % 6);
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="url(#dustDot)">
            <animate
              attributeName="cy"
              values={`${cy};${(cy + 200) % 800};${cy}`}
              dur={`${dur}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.2;0.9;0.2"
              dur={`${dur * 0.8}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </svg>
  );
}
