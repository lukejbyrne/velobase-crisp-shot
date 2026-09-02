"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowRight, Camera, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";
import { SiteFooter } from "@/components/layout/site-footer";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { HEADSHOT_STYLES } from "@/modules/headshots/styles";
import { BeforeAfterShowcase } from "@/modules/headshots/components/before-after-showcase";
import { CreditPacks } from "@/modules/headshots/components/credit-packs";
import { CreditLifecycle } from "@/modules/headshots/components/credit-lifecycle";
import { cn } from "@/lib/utils";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export default function HomePage() {
  const t = useTranslations("landing");
  const tStyles = useTranslations("headshots.styles");
  const { data: session } = useSession();
  const { setLoginModalOpen } = useAuthStore();

  const primaryHref = session ? "/studio" : null;

  return (
    <div className="bg-background text-foreground relative min-h-screen w-full overflow-x-hidden">
      <Background />
      <Header />

      {/* ---------------------------------------------------------------- Hero */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-32 pb-16">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div className="space-y-6">
            <span className="border-border bg-card/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="text-primary h-3.5 w-3.5" />
              {t("hero.eyebrow")}
            </span>

            <h1 className="font-poppins text-5xl leading-[1.05] font-medium tracking-tight md:text-6xl">
              {t("hero.titleLine1")}{" "}
              <span className="animate-gradient-x bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                {t("hero.titleLine2")}
              </span>
            </h1>

            <p className="text-muted-foreground max-w-xl text-lg">
              {t("hero.subtitle")}{" "}
              <span className="text-foreground/80">
                {t("hero.subtitleAccent")}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {primaryHref ? (
                <Button asChild size="lg">
                  <Link href={primaryHref}>
                    {t("hero.primaryCta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setLoginModalOpen(true, undefined, "url")}
                >
                  {t("hero.signedOutCta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button asChild size="lg" variant="ghost">
                <Link href="/pricing">{t("hero.secondaryCta")}</Link>
              </Button>
            </div>

            <p className="text-muted-foreground text-sm">{t("hero.trust")}</p>
          </div>

          <BeforeAfterShowcase />
        </div>
      </main>

      {/* ------------------------------------------------------ Before / after */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-poppins text-3xl font-medium tracking-tight">
            {t("beforeAfter.title")}
          </h2>
          <p className="text-muted-foreground mt-3">
            {t("beforeAfter.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {(
            [
              { key: "step1", icon: <Upload className="h-5 w-5" /> },
              { key: "step2", icon: <Sparkles className="h-5 w-5" /> },
              { key: "step3", icon: <Camera className="h-5 w-5" /> },
            ] as const
          ).map((step, index) => (
            <div
              key={step.key}
              className="border-border bg-card/60 rounded-2xl border p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                  {step.icon}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">
                {t(`how.${step.key}.title` as "how.step1.title")}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {t(`how.${step.key}.description` as "how.step1.description")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- Styles */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-poppins text-3xl font-medium tracking-tight">
            {t("styles.title")}
          </h2>
          <p className="text-muted-foreground mt-3">{t("styles.subtitle")}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {HEADSHOT_STYLES.map((style) => (
            <figure key={style.key} className="text-center">
              <div
                className={cn(
                  "aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br",
                  style.accentClassName,
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.sampleImage}
                  alt={tStyles(style.labelKey)}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2 text-sm font-medium">
                {tStyles(style.labelKey)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Credits */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <CreditLifecycle />
      </section>

      {/* ------------------------------------------------------------ Pricing */}
      <section
        id="pricing"
        className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-poppins text-3xl font-medium tracking-tight">
            {t("pricing.title")}
          </h2>
          <p className="text-muted-foreground mt-3">{t("pricing.subtitle")}</p>
        </div>
        <CreditPacks className="mt-12" />
      </section>

      {/* ---------------------------------------------------------------- FAQ */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="font-poppins text-center text-3xl font-medium tracking-tight">
          {t("faq.title")}
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ_KEYS.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="text-left">
                {t(`faq.${key}.question` as "faq.q1.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t(`faq.${key}.answer` as "faq.q1.answer")}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ----------------------------------------------------------- Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-20 text-center">
        <h2 className="font-poppins text-3xl font-medium tracking-tight md:text-4xl">
          {t("finalCta.title")}
        </h2>
        <p className="text-muted-foreground mt-3">{t("finalCta.subtitle")}</p>
        <div className="mt-8">
          {primaryHref ? (
            <Button asChild size="lg">
              <Link href={primaryHref}>
                {t("finalCta.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => setLoginModalOpen(true, undefined, "url")}
            >
              {t("finalCta.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
