"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explains the freeze -> consume -> unfreeze model in the user's own terms.
 *
 * This is the part of the pricing that surprises people, so it gets its own
 * section rather than a footnote.
 */
export function CreditLifecycle({ className }: { className?: string }) {
  const t = useTranslations("landing.credits");

  const steps = [
    {
      key: "freeze",
      icon: <Lock className="h-5 w-5" />,
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    {
      key: "consume",
      icon: <CheckCircle2 className="h-5 w-5" />,
      accent: "text-primary bg-primary/10",
    },
    {
      key: "unfreeze",
      icon: <RotateCcw className="h-5 w-5" />,
      accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    },
  ] as const;

  return (
    <section className={cn("", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-poppins text-3xl font-medium tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mt-3">{t("subtitle")}</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className="border-border bg-card rounded-2xl border p-6"
          >
            <span
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                step.accent,
              )}
            >
              {step.icon}
            </span>
            <h3 className="mt-4 font-semibold">
              {t(`${step.key}.title` as "freeze.title")}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t(`${step.key}.description` as "freeze.description")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
