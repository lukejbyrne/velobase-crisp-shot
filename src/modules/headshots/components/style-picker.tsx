"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StyleOption {
  key: string;
  labelKey: string;
  accentClassName: string;
  sampleImage: string;
}

export function StylePicker({
  styles,
  value,
  onChange,
  max,
  disabled,
  className,
}: {
  styles: StyleOption[];
  /** Chosen styles, in pick order. */
  value: string[];
  onChange: (keys: string[]) => void;
  /** Most styles that can be chosen at once. */
  max: number;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("headshots.styles");

  return (
    <div
      role="group"
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}
    >
      {styles.map((style) => {
        const order = value.indexOf(style.key);
        const isSelected = order !== -1;
        // Once the cap is reached, unpicked styles are disabled rather than
        // silently ignored, so the limit is visible before it is hit.
        const atCapacity = !isSelected && value.length >= max;
        return (
          <button
            key={style.key}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={disabled || atCapacity}
            onClick={() =>
              onChange(
                isSelected
                  ? value.filter((key) => key !== style.key)
                  : [...value, style.key],
              )
            }
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
              isSelected
                ? "border-primary ring-primary/30 ring-2"
                : "border-border hover:border-primary/50",
              (disabled || atCapacity) && "cursor-not-allowed opacity-40",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mb-2 block aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br",
                style.accentClassName,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={style.sampleImage}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="block text-sm font-medium">
              {t(style.labelKey)}
            </span>
            {isSelected && (
              <span
                className="bg-primary text-primary-foreground absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                // The number is the pick order, which is also the order the
                // styles are dealt across the batch's images.
                title={`Pick ${order + 1}`}
              >
                {value.length > 1 ? order + 1 : <Check className="h-3 w-3" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
