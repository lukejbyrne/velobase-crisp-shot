"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { APP_NAME } from "@/config/brand";

export function SiteFooter() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("landing.footer");

  return (
    <footer className="w-full py-8 px-4 border-t border-border bg-background text-muted-foreground text-xs md:text-sm mt-auto z-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. {tFooter("tagline")}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t("privacyPolicy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t("termsOfService")}
          </Link>
          <Link href="/refund-policy" className="hover:text-foreground transition-colors">
            {t("refundPolicy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
