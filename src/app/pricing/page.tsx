import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";
import { SiteFooter } from "@/components/layout/site-footer";
import { CreditPacks } from "@/modules/headshots/components/credit-packs";
import { CreditLifecycle } from "@/modules/headshots/components/credit-lifecycle";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.pricing");
  return { title: t("title"), description: t("subtitle") };
}

export default async function PricingPage() {
  const t = await getTranslations("landing.pricing");

  return (
    <div className="bg-background text-foreground relative min-h-screen">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="font-poppins text-4xl font-medium tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3">{t("subtitle")}</p>
        </header>

        <CreditPacks className="mt-12" />
        <CreditLifecycle className="mt-20" />
      </main>
      <SiteFooter />
    </div>
  );
}
