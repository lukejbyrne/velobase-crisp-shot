"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { styleLabelKey } from "../styles";

/**
 * Private results gallery.
 *
 * Only images that actually completed are listed, and each download is
 * authorised server-side at click time rather than exposing a permanent URL.
 */
export function GalleryView() {
  const t = useTranslations("headshots.gallery");
  const tStyles = useTranslations("headshots.styles");

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.headshots.listImages.useInfiniteQuery(
      { limit: 24 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    );

  const images = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-poppins text-3xl font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Skeleton key={index} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
          <ImageOff className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground">{t("empty")}</p>
          <Button asChild>
            <Link href="/studio">{t("emptyCta")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <GalleryTile
                key={image.id}
                id={image.id}
                imageUrl={image.imageUrl}
                styleLabel={tStyles(styleLabelKey(image.styleKey))}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GalleryTile({
  id,
  imageUrl,
  styleLabel,
}: {
  id: string;
  imageUrl: string | null;
  styleLabel: string;
}) {
  const t = useTranslations("headshots.gallery");
  const [isPreparing, setIsPreparing] = useState(false);
  const download = api.headshots.getDownloadUrl.useMutation();

  const handleDownload = async () => {
    setIsPreparing(true);
    try {
      const result = await download.mutateAsync({ imageId: id });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <figure className="group border-border bg-muted relative overflow-hidden rounded-xl border">
      <div className="aspect-[4/5] w-full">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={styleLabel}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>

      <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <span className="text-xs font-medium text-white">{styleLabel}</span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2 text-xs"
          disabled={isPreparing}
          onClick={() => void handleDownload()}
        >
          {isPreparing ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Download className="mr-1 h-3 w-3" />
          )}
          {isPreparing ? t("downloading") : t("download")}
        </Button>
      </figcaption>
    </figure>
  );
}
