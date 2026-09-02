"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreditsPackages } from "@/hooks/use-pricing-products";
import { useSmartCheckout } from "@/hooks/use-smart-checkout";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

interface PackDescription {
  en?: string;
  badge?: string;
  features?: string[];
}

/**
 * Credit pack grid.
 *
 * Prices, credit amounts and badges all come from product rows, so a pack can
 * be repriced or added in the database without a deploy.
 */
export function CreditPacks({
  className,
  headline,
}: {
  className?: string;
  headline?: React.ReactNode;
}) {
  const t = useTranslations("landing.pricing");
  const { data: session } = useSession();
  const { setLoginModalOpen } = useAuthStore();
  const { products, isLoading } = useCreditsPackages({ limit: 10 });
  const { startCheckout } = useSmartCheckout();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleBuy = async (productId: string) => {
    if (!session) {
      setLoginModalOpen(true, undefined, "credits_dialog");
      return;
    }
    setPendingId(productId);
    const result = await startCheckout({ productId });
    if (result.status !== "REDIRECTING") setPendingId(null);
  };

  if (isLoading) {
    return (
      <div
        className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}
      >
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-80 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-center", className)}>
        {t("empty")}
      </p>
    );
  }

  return (
    <div className={className}>
      {headline}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const description = (product.description ?? {}) as PackDescription;
          const credits = product.creditsAmount ?? 0;
          const badge = description.badge;
          const isFeatured = Boolean(badge);
          const perHeadshot =
            credits > 0
              ? formatPrice(
                  Math.round(product.price / credits),
                  product.currency,
                )
              : null;

          return (
            <div
              key={product.id}
              className={cn(
                "bg-card relative flex flex-col rounded-2xl border p-6 transition-shadow",
                isFeatured
                  ? "border-primary/60 shadow-primary/10 shadow-lg"
                  : "border-border hover:shadow-md",
              )}
            >
              {badge && (
                <Badge className="absolute -top-3 left-6 rounded-full px-3">
                  {badge}
                </Badge>
              )}

              <h3 className="text-lg font-semibold">{product.name}</h3>
              {description.en && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {description.en}
                </p>
              )}

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-poppins text-4xl font-medium tracking-tight">
                  {product.displayPrice}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-muted-foreground text-sm line-through">
                    {formatPrice(product.originalPrice, product.currency)}
                  </span>
                )}
              </div>
              {perHeadshot && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("perHeadshot", { price: perHeadshot })}
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {(description.features ?? []).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={isFeatured ? "default" : "outline"}
                disabled={pendingId === product.id}
                onClick={() => void handleBuy(product.id)}
              >
                {pendingId === product.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {session ? t("cta") : t("ctaSignedOut")}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        {t("footnote", {
          currency: (products[0]?.currency ?? "usd").toUpperCase(),
        })}
      </p>
    </div>
  );
}
