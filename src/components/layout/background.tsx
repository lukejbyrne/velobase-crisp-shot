/**
 * Ambient page background.
 *
 * The grain is an inline data URI rather than a remote SVG: the previous
 * external host now 404s, so every page load fetched a missing cross-origin
 * asset and the texture never rendered.
 */
const NOISE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">` +
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter>` +
    `<rect width="120" height="120" filter="url(#n)" opacity="0.55"/>` +
    `</svg>`,
);

export function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-0 dark:opacity-[0.15]"
        style={{ backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")` }}
      />
    </div>
  );
}
