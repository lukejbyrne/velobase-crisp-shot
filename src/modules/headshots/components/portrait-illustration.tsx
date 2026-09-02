"use client";

import { cn } from "@/lib/utils";

/**
 * Stylised portrait used on the landing page.
 *
 * Deliberately an illustration rather than a photograph: it demonstrates what
 * changes between a snapshot and a studio headshot — light direction, backdrop,
 * wardrobe, crop — without presenting an invented person as a real customer.
 */
export function PortraitIllustration({
  variant,
  className,
}: {
  variant: "before" | "after";
  className?: string;
}) {
  const isAfter = variant === "after";
  const uid = isAfter ? "after" : "before";

  return (
    <svg
      viewBox="0 0 320 400"
      role="presentation"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          {isAfter ? (
            <>
              <stop offset="0%" stopColor="#e7ecf3" />
              <stop offset="55%" stopColor="#c8d3e2" />
              <stop offset="100%" stopColor="#9caec6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#5d6b63" />
              <stop offset="100%" stopColor="#39413d" />
            </>
          )}
        </linearGradient>

        <linearGradient id={`${uid}-skin`} x1="0.2" y1="0" x2="1" y2="1">
          {isAfter ? (
            <>
              <stop offset="0%" stopColor="#f0cdb0" />
              <stop offset="60%" stopColor="#dcae8d" />
              <stop offset="100%" stopColor="#b98a6b" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#c9a184" />
              <stop offset="100%" stopColor="#8d6a52" />
            </>
          )}
        </linearGradient>

        <linearGradient id={`${uid}-garment`} x1="0" y1="0" x2="1" y2="1">
          {isAfter ? (
            <>
              <stop offset="0%" stopColor="#2b3446" />
              <stop offset="100%" stopColor="#161c27" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#7d8a6f" />
              <stop offset="100%" stopColor="#59634f" />
            </>
          )}
        </linearGradient>

        <radialGradient id={`${uid}-key`} cx="0.32" cy="0.24" r="0.75">
          <stop
            offset="0%"
            stopColor="#ffffff"
            stopOpacity={isAfter ? 0.5 : 0.12}
          />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="400" fill={`url(#${uid}-bg)`} />

      {/* A cluttered room reads as "snapshot"; the studio version stays clean. */}
      {!isAfter && (
        <g opacity="0.5">
          <rect x="16" y="40" width="70" height="96" rx="4" fill="#2f362f" />
          <rect x="238" y="18" width="66" height="150" rx="4" fill="#454e42" />
          <rect x="0" y="286" width="320" height="10" fill="#2b312c" />
          <circle cx="272" cy="248" r="30" fill="#4d5749" />
        </g>
      )}

      <rect
        width="320"
        height="400"
        fill={`url(#${uid}-key)`}
        style={{ mixBlendMode: "screen" }}
      />

      {/* Head and shoulders. The studio version is centred and cropped tighter. */}
      <g
        transform={isAfter ? "translate(0 0)" : "translate(-26 34) scale(0.86)"}
      >
        <path
          d="M160 214c58 0 96 34 104 84 3 18 4 46 4 102H52c0-56 1-84 4-102 8-50 46-84 104-84z"
          fill={`url(#${uid}-garment)`}
        />
        {isAfter && (
          <>
            <path
              d="M160 214c-16 0-30 3-42 8l42 62 42-62c-12-5-26-8-42-8z"
              fill="#f4f6fa"
            />
            <path d="M160 284l-14 24 14 22 14-22-14-24z" fill="#39445c" />
          </>
        )}
        <path
          d="M136 176h48v46a24 24 0 0 1-48 0v-46z"
          fill={`url(#${uid}-skin)`}
        />
        <ellipse cx="160" cy="126" rx="56" ry="66" fill={`url(#${uid}-skin)`} />
        <path
          d="M104 118c0-40 25-64 56-64s56 24 56 64c0 8-2 14-4 14-4 0-6-30-18-36-14-7-38 2-58-2-16-3-24 12-26 30-2 12-6 4-6-6z"
          fill="#2c2320"
        />
        <ellipse cx="139" cy="128" rx="6" ry="7" fill="#2a2320" />
        <ellipse cx="181" cy="128" rx="6" ry="7" fill="#2a2320" />
        <path
          d={isAfter ? "M142 158c6 7 30 7 36 0" : "M144 160c6 4 26 4 32 0"}
          stroke="#5c4438"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Rim light only exists in the studio setup. */}
        {isAfter && (
          <path
            d="M216 118c0 40-25 74-56 74"
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Snapshots skew; studio frames sit level. */}
      {!isAfter && (
        <rect width="320" height="400" fill="#101510" opacity="0.22" />
      )}
    </svg>
  );
}
