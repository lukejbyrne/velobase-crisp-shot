"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Coins, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { PortraitUploader, type UploadedPortrait } from "./portrait-uploader";
import { StylePicker } from "./style-picker";
import { BatchProgress } from "./batch-progress";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

/**
 * The studio: upload a portrait, pick a style, spend credits, watch the batch.
 *
 * The active batch is polled while it is still running and left alone once it
 * settles, so a finished page stops talking to the server entirely.
 */
export function StudioView() {
  const t = useTranslations("headshots.studio");
  const tGenerate = useTranslations("headshots.generate");
  const tStyle = useTranslations("headshots.style");
  const tUpload = useTranslations("headshots.upload");
  const tBatch = useTranslations("headshots.batch");

  const [portrait, setPortrait] = useState<UploadedPortrait | null>(null);
  const [styleKey, setStyleKey] = useState<string | null>(null);
  const [forceFailure, setForceFailure] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const utils = api.useUtils();
  const settings = api.headshots.settings.useQuery();
  const credits = api.headshots.credits.useQuery(undefined, {
    refetchInterval: activeBatchId ? 4000 : false,
  });

  const batch = api.headshots.getBatch.useQuery(
    { batchId: activeBatchId ?? "" },
    {
      enabled: Boolean(activeBatchId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && TERMINAL_STATUSES.has(status) ? false : 3000;
      },
    },
  );

  const createBatch = api.headshots.createBatch.useMutation({
    onSuccess: (created) => {
      setActiveBatchId(created.id);
      void utils.headshots.credits.invalidate();
      void utils.headshots.listImages.invalidate();
      void utils.headshots.listBatches.invalidate();
    },
    onError: (error) => {
      toast.error(friendlyError(error.message));
    },
  });

  if (settings.isLoading || !settings.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const config = settings.data;
  const available = credits.data?.available ?? 0;
  const canAfford = available >= config.creditsPerBatch;
  const isBusy = createBatch.isPending;
  const canSubmit = Boolean(portrait && styleKey) && canAfford && !isBusy;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-poppins text-3xl font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="space-y-3">
          <StepHeading
            index={1}
            label={t("stepUpload")}
            title={tUpload("title")}
          />
          <PortraitUploader
            value={portrait}
            onChange={setPortrait}
            acceptedTypes={config.acceptedUploadTypes}
            maxBytes={config.maxUploadBytes}
            disabled={isBusy}
          />
        </section>

        <div className="space-y-8">
          <section className="space-y-3">
            <StepHeading
              index={2}
              label={t("stepStyle")}
              title={tStyle("title")}
            />
            <p className="text-muted-foreground text-sm">
              {tStyle("subtitle")}
            </p>
            <StylePicker
              styles={config.styles}
              value={styleKey}
              onChange={setStyleKey}
              disabled={isBusy}
            />
          </section>

          <section className="border-border bg-card space-y-4 rounded-2xl border p-5">
            <StepHeading
              index={3}
              label={t("stepGenerate")}
              title={tGenerate("title")}
            />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {tGenerate("cost", { credits: config.creditsPerBatch })}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-2",
                  canAfford ? "text-muted-foreground" : "text-destructive",
                )}
              >
                <Coins className="h-4 w-4" />
                {credits.isLoading ? "…" : tGenerate("balance", { available })}
              </span>
            </div>

            {config.forcedFailureAvailable && (
              <label className="flex items-start gap-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3">
                <Checkbox
                  checked={forceFailure}
                  onCheckedChange={(checked) =>
                    setForceFailure(checked === true)
                  }
                  disabled={isBusy}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                    {tGenerate("forceFailureLabel")}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {tGenerate("forceFailureHint")}
                  </span>
                </span>
              </label>
            )}

            {!canAfford && !credits.isLoading && (
              <div className="border-border bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">
                  {tGenerate("needCredits", {
                    required: config.creditsPerBatch,
                    available,
                  })}
                </p>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/credits">{tGenerate("buyCredits")}</Link>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                disabled={!canSubmit}
                onClick={() => {
                  if (!portrait) {
                    toast.error(tGenerate("needPhoto"));
                    return;
                  }
                  if (!styleKey) {
                    toast.error(tGenerate("needStyle"));
                    return;
                  }
                  createBatch.mutate({
                    styleKey,
                    sourceStorageKey: portrait.storageKey,
                    sourceImageUrl: portrait.publicUrl,
                    devForceFailure: forceFailure,
                  });
                }}
              >
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBusy
                  ? tGenerate("pending")
                  : tGenerate("cta", { count: config.batchSize })}
              </Button>

              {activeBatchId && (
                <Button asChild variant="ghost">
                  <Link href="/gallery">{tBatch("viewGallery")}</Link>
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="border-border border-t pt-8">
        {batch.data ? (
          <BatchProgress batch={batch.data} />
        ) : (
          <p className="text-muted-foreground text-sm">{tBatch("empty")}</p>
        )}
      </section>
    </div>
  );
}

function StepHeading({
  index,
  label,
  title,
}: {
  index: number;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
        {index}
      </span>
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {label}
        </p>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
    </div>
  );
}

/**
 * Service errors are prefixed with a machine-readable code; strip it so the
 * toast reads as a sentence rather than an error dump.
 */
function friendlyError(message: string): string {
  return message.replace(/^[A-Z_]+:\s*/, "");
}
