/** Headline with a slow, candle-flicker bloom behind it. */
export default function GlowHeading({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-flicker"
        style={{
          background:
            'radial-gradient(closest-side, rgba(185,28,28,0.55), rgba(185,28,28,0) 70%)',
          transform: 'scale(1.6)',
        }}
      />
      {children}
    </span>
  );
}
