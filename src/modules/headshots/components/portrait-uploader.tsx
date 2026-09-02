"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedPortrait {
  storageKey: string;
  publicUrl: string;
}

interface PortraitUploaderProps {
  value: UploadedPortrait | null;
  onChange: (value: UploadedPortrait | null) => void;
  acceptedTypes: string[];
  maxBytes: number;
  disabled?: boolean;
}

/**
 * Source-portrait upload.
 *
 * Client-side checks are a convenience only — the upload route re-validates
 * type, size and magic bytes, because anything the browser asserts can be
 * forged.
 */
export function PortraitUploader({
  value,
  onChange,
  acceptedTypes,
  maxBytes,
  disabled,
}: PortraitUploaderProps) {
  const t = useTranslations("headshots.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const maxMb = Math.round(maxBytes / (1024 * 1024));

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (
        !acceptedTypes.includes(file.type.split(";")[0]?.toLowerCase() ?? "")
      ) {
        setError(t("errorType"));
        return;
      }
      if (file.size > maxBytes) {
        setError(t("errorSize", { size: maxMb }));
        return;
      }

      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      setIsUploading(true);

      try {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/headshots/upload", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as {
          storageKey?: string;
          publicUrl?: string;
          error?: string;
        };

        if (!response.ok || !payload.storageKey || !payload.publicUrl) {
          setError(payload.error ?? t("errorGeneric"));
          setPreview(null);
          onChange(null);
          return;
        }

        onChange({
          storageKey: payload.storageKey,
          publicUrl: payload.publicUrl,
        });
      } catch {
        setError(t("errorGeneric"));
        setPreview(null);
        onChange(null);
      } finally {
        setIsUploading(false);
      }
    },
    [acceptedTypes, maxBytes, maxMb, onChange, t],
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void upload(file);
  };

  const shownImage = preview ?? value?.publicUrl ?? null;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/40 hover:border-primary/60",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {shownImage ? (
          <>
            {/* Remote storage hosts vary by deployment, so this bypasses the
                Next image optimiser rather than pinning hostnames in config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shownImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            {isUploading && (
              <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 px-6">
            {isUploading ? (
              <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
            ) : (
              <ImagePlus className="text-muted-foreground mx-auto h-8 w-8" />
            )}
            <p className="text-sm font-medium">
              {isUploading ? t("uploading") : t("prompt")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("hint", { size: maxMb })}
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          // Allows re-selecting the same file after an error.
          event.target.value = "";
        }}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {value && !isUploading && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">{t("ready")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setPreview(null);
              onChange(null);
              inputRef.current?.click();
            }}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            {t("change")}
          </Button>
        </div>
      )}
    </div>
  );
}
