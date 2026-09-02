"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StyleOption {
  key: string;
  labelKey: string;
  accentClassName: string;
}

export function StylePicker({
  styles,
  value,
  onChange,
  disabled,
  className,
}: {
  styles: StyleOption[];
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("headshots.styles");

  return (
    <div
      role="radiogroup"
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}
    >
      {styles.map((style) => {
        const isSelected = value === style.key;
        return (
          <button
            key={style.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(style.key)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
              isSelected
                ? "border-primary ring-primary/30 ring-2"
                : "border-border hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mb-2 block h-14 w-full rounded-lg bg-gradient-to-br",
                style.accentClassName,
              )}
            />
            <span className="block text-sm font-medium">
              {t(style.labelKey)}
            </span>
            {isSelected && (
              <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
