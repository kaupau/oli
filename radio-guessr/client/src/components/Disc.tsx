// A small glossy CD, drawn with SVG so it stays crisp at any size. Spins while
// audio plays; shows album art instead when a reveal provides one.

export function Disc({
  size = 56,
  spinning = false,
  src,
}: {
  size?: number;
  spinning?: boolean;
  src?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
      />
    );
  }
  const uid = `d${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={spinning ? "spin" : ""}
      style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
    >
      <defs>
        <radialGradient id={`${uid}-disc`} cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#f4f7fb" />
          <stop offset="44%" stopColor="#d2dbe7" />
          <stop offset="72%" stopColor="#abb7c8" />
          <stop offset="100%" stopColor="#c9d2de" />
        </radialGradient>
        <radialGradient id={`${uid}-hub`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#fafbfc" />
          <stop offset="100%" stopColor="#d6dbe1" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${uid}-disc)`} stroke="#8a95a6" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(120,135,160,0.3)" strokeWidth="6" />
      <ellipse
        cx="38"
        cy="29"
        rx="23"
        ry="10"
        fill="rgba(255,255,255,0.45)"
        transform="rotate(-34 38 29)"
      />
      <circle cx="50" cy="50" r="12" fill={`url(#${uid}-hub)`} stroke="#9aa3b0" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="4.5" fill="#eaecf0" stroke="#aab2bf" strokeWidth="0.6" />
    </svg>
  );
}
