"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PortraitIllustration } from "./portrait-illustration";

/**
 * Draggable before/after comparison.
 *
 * The reveal is a `clip-path` over a full-size layer rather than a width
 * animation, so the clipped image wipes across instead of squashing. The
 * divider is backed by a range input so it stays keyboard operable.
 */
export function BeforeAfterShowcase({ className }: { className?: string }) {
  const t = useTranslations("landing.beforeAfter");
  const [position, setPosition] = useState(45);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={frameRef}
        className="border-border bg-muted relative aspect-[4/5] w-full touch-none overflow-hidden rounded-2xl border shadow-2xl select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) setFromClientX(event.clientX);
        }}
      >
        <div className="absolute inset-0">
          <PortraitIllustration variant="after" />
        </div>

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <PortraitIllustration variant="before" />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.45)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-xs font-semibold text-slate-700">
            ⟷
          </div>
        </div>

        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {t("before")}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-slate-900 backdrop-blur-sm">
          {t("after")}
        </span>

        <label className="sr-only" htmlFor="crispshot-compare">
          {t("title")}
        </label>
        <input
          id="crispshot-compare"
          type="range"
          min={0}
          max={100}
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute inset-x-0 bottom-0 h-10 w-full cursor-ew-resize opacity-0"
        />
      </div>

      <div className="text-muted-foreground mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-foreground font-medium">{t("before")}: </span>
          {t("beforeCaption")}
        </p>
        <p className="sm:text-right">
          <span className="text-foreground font-medium">{t("after")}: </span>
          {t("afterCaption")}
        </p>
      </div>
      <p className="text-muted-foreground/70 mt-2 text-xs">{t("note")}</p>
    </div>
  );
}
