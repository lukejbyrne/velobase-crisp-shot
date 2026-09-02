"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  RotateCcw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";
import { styleLabelKey } from "../styles";

type Batch = RouterOutputs["headshots"]["getBatch"];
type BatchImage = Batch["images"][number];

/**
 * Live view of one batch.
 *
 * Each tile shows both the generation status and where that image's credit
 * currently sits, because "frozen but not charged" is the part of the billing
 * model users most need to see rather than be told about.
 */
export function BatchProgress({ batch }: { batch: Batch }) {
  const t = useTranslations("headshots.batch");
  const tStatus = useTranslations("headshots.status");
  const tStyles = useTranslations("headshots.styles");

  const settled = batch.completedCount + batch.failedCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("styleLabel")}:{" "}
            {batch.styleKeys
              .map((key) => tStyles(styleLabelKey(key)))
              .join(", ")}{" "}
            ·{" "}
            {t("progress", {
              completed: settled,
              total: batch.requestedCount,
            })}
          </p>
        </div>
        <StatusPill status={batch.status} label={tStatus(batch.status)} />
      </div>

      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={settled}
        aria-valuemin={0}
        aria-valuemax={batch.requestedCount}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${(settled / Math.max(1, batch.requestedCount)) * 100}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {batch.images.map((image) => (
          <ImageTile key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
}

function ImageTile({ image }: { image: BatchImage }) {
  const t = useTranslations("headshots.batch");
  const tStyles = useTranslations("headshots.styles");
  const tStatus = useTranslations("headshots.status");
  const tCredit = useTranslations("headshots.creditState");
  const tGallery = useTranslations("headshots.gallery");
  const [isPreparing, setIsPreparing] = useState(false);

  const download = api.headshots.getDownloadUrl.useMutation();

  const handleDownload = async () => {
    setIsPreparing(true);
    try {
      const result = await download.mutateAsync({ imageId: image.id });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(tGallery("downloadFailed"));
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="bg-muted/50 relative flex aspect-[4/5] items-center justify-center">
        {image.status === "COMPLETED" && image.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="px-3 text-center">
            <StatusIcon status={image.status} />
            <p className="mt-2 text-xs font-medium">{tStatus(image.status)}</p>
            {image.errorMessage && (
              <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                {image.errorMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="border-border text-muted-foreground border-t px-3 pt-2 text-[11px] font-medium">
        {tStyles(styleLabelKey(image.styleKey))}
      </p>

      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium",
            image.creditState === "CONSUMED" && "text-foreground",
            image.creditState === "FROZEN" &&
              "text-amber-600 dark:text-amber-400",
            image.creditState === "UNFROZEN" &&
              "text-emerald-600 dark:text-emerald-400",
            image.creditState === "NONE" && "text-muted-foreground",
          )}
          title={`${t("creditLabel")}: ${tCredit(image.creditState)}`}
        >
          <CreditIcon state={image.creditState} />
          {tCredit(image.creditState)}
        </span>

        {image.status === "COMPLETED" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isPreparing}
            onClick={() => void handleDownload()}
          >
            {isPreparing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: BatchImage["status"] }) {
  const className = "mx-auto h-6 w-6";
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className={cn(className, "text-emerald-500")} />;
    case "PROCESSING":
      return <Loader2 className={cn(className, "text-primary animate-spin")} />;
    case "FAILED":
      return <AlertCircle className={cn(className, "text-destructive")} />;
    case "CANCELLED":
      return <RotateCcw className={cn(className, "text-muted-foreground")} />;
    default:
      return <Clock className={cn(className, "text-muted-foreground")} />;
  }
}

function CreditIcon({ state }: { state: BatchImage["creditState"] }) {
  const className = "h-3 w-3";
  switch (state) {
    case "FROZEN":
      return <Lock className={className} />;
    case "CONSUMED":
      return <CheckCircle2 className={className} />;
    case "UNFROZEN":
      return <RotateCcw className={className} />;
    default:
      return <Clock className={className} />;
  }
}

function StatusPill({
  status,
  label,
}: {
  status: Batch["status"];
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        status === "COMPLETED" &&
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        status === "FAILED" && "bg-destructive/10 text-destructive",
        status === "PROCESSING" && "bg-primary/10 text-primary",
        status === "QUEUED" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
