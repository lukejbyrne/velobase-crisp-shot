import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";
import { SiteFooter } from "@/components/layout/site-footer";
import { GalleryView } from "@/modules/headshots/components/gallery-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("headshots.gallery");
  return { title: t("title"), description: t("subtitle") };
}

export default async function GalleryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=%2Fgallery");
  }

  return (
    <div className="bg-background text-foreground relative min-h-screen">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <GalleryView />
      </main>
      <SiteFooter />
    </div>
  );
}
