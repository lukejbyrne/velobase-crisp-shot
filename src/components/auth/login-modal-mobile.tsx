"use client";

import * as React from "react";
import {
  Mail,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useLogin, TURNSTILE_SITE_KEY } from "./use-login";
import { OAUTH_PROVIDERS } from "./oauth-providers";
import Script from "next/script";
import { useTranslations } from "next-intl";

// ============ Mobile-Specific Sub-components ============

const MobilePromotionBadge = () => null;

// Turnstile Widget Wrapper
const MobileTurnstileWidget: React.FC<{
  onSuccess: (token: string) => void;
}> = ({ onSuccess }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = React.useState(false);

  const renderWidget = React.useCallback(() => {
    if (typeof window === "undefined" || rendered || !containerRef.current)
      return;
    const w = window as unknown as {
      turnstile?: {
        render: (
          container: HTMLElement,
          options: { sitekey: string; callback: (token: string) => void },
        ) => void;
      };
    };
    if (!w.turnstile) return;

    w.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY ?? "",
      callback: (token: string) => {
        onSuccess(token);
        if (typeof document !== "undefined") {
          document.cookie = `cf_turnstile_token=${token}; path=/; max-age=600`;
        }
      },
    });
    setRendered(true);
  }, [rendered, onSuccess]);

  React.useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onLoad={renderWidget}
      />
      <div ref={containerRef} className="my-4 flex justify-center" />
    </>
  );
};

export function LoginModalMobile() {
  const t = useTranslations("auth");
  const login = useLogin();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 仅在首次进入 Email 视图时聚焦，不干预后续行为
  React.useEffect(() => {
    if (login.view === "email" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true }); // 尽可能不触发滚动，让浏览器自己决定
      }, 100);
    }
  }, [login.view]);

  return (
    <Drawer
      open={login.loginModalOpen}
      onOpenChange={login.handleModalClose}
      shouldScaleBackground
    >
      <DrawerContent className="flex max-h-[92dvh] flex-col rounded-t-[20px] bg-white outline-none dark:bg-slate-950">
        <VisuallyHidden.Root>
          <DrawerTitle>{t("welcomeTitle")}</DrawerTitle>
          <DrawerDescription>{t("welcomeSubtitle")}</DrawerDescription>
        </VisuallyHidden.Root>

        {/* 顶部把手 - 也是 Drawer 默认会带的，这里不渲染自定义的了 */}

        {/* 
          主要内容区域 
          关键点：
          1. flex-1 overflow-y-auto: 允许内容滚动
          2. pb-32: 底部留出大片缓冲区，这样当键盘弹起时，浏览器有足够的空间把输入框顶上来，
             而不会因为到底了顶不动。
        */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          {/* ============ View 1: Main (Social Options) ============ */}
          {login.view === "main" && (
            <div className="animate-in slide-in-from-bottom-4 flex flex-col items-center pt-8 duration-300">
              <div className="mb-6 scale-110">
                <AppLogo size="lg" />
              </div>

              <div className="mb-8 space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {t("welcomeTitle")}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {t("welcomeSubtitle")}
                </p>
                <div className="pt-2">
                  <MobilePromotionBadge />
                </div>
              </div>

              <div className="w-full space-y-3">
                {OAUTH_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => login.handleOAuthLogin(provider.id)}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition-transform active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {provider.logo}
                    {t("continueWith", { provider: provider.name })}
                  </button>
                ))}

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                  <span className="mx-4 flex-shrink-0 text-xs font-medium tracking-wider text-slate-400 uppercase">
                    {t("or")}
                  </span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                </div>

                <button
                  onClick={login.handleEmailMethodSelect}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-100 text-lg font-semibold text-slate-900 transition-transform active:scale-[0.98] dark:bg-slate-900 dark:text-white"
                >
                  <Mail className="h-5 w-5" />
                  {t("continueWithEmail")}
                </button>
              </div>

              <p className="mt-12 px-4 text-center text-xs leading-relaxed text-slate-400">
                {t("termsAgreement")}
              </p>
            </div>
          )}

          {/* ============ View 2: Email Input ============ */}
          {login.view === "email" && (
            <div className="animate-in slide-in-from-right-8 flex flex-col pt-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={login.handleBack}
                  className="-ml-2 p-2 text-slate-500 active:text-slate-900 dark:active:text-slate-200"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <DrawerClose className="-mr-2 p-2 text-slate-400 active:text-slate-600">
                  <X className="h-6 w-6" />
                </DrawerClose>
              </div>

              <h2 className="mb-2 text-2xl font-bold">
                {login.isPasswordMode ? t("welcomeBack") : t("signInWithEmail")}
              </h2>
              <p className="mb-8 text-slate-500">
                {login.isPasswordMode
                  ? t("enterPasswordDesc")
                  : t("emailCodeDesc")}
              </p>

              <form
                onSubmit={login.handleFormSubmit}
                className="flex flex-col gap-4"
              >
                <div className="space-y-1.5">
                  <label className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("emailLabel")}
                  </label>
                  <input
                    ref={inputRef}
                    type="email"
                    value={login.email}
                    onChange={(e) => login.handleEmailChange(e.target.value)}
                    onBlur={(e) => login.handleEmailBlur(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className={cn(
                      "h-14 w-full rounded-xl border bg-slate-50 px-4 text-lg transition-all outline-none dark:bg-slate-900",
                      login.error
                        ? "border-red-300 bg-red-50/50 focus:border-red-500"
                        : "border-transparent focus:border-slate-300 focus:bg-white dark:focus:border-slate-700 dark:focus:bg-slate-950",
                    )}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                  />

                  {/* Inline Autocomplete */}
                  {login.showAutocomplete && login.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {login.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            login.handleAutocompleteSuggestionClick(suggestion);
                          }}
                          className="flex items-center gap-2 rounded-lg px-4 py-3 text-left transition-colors hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-slate-900"
                        >
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-base text-slate-700 dark:text-slate-200">
                            {suggestion.split("@")[0]}
                            <span className="text-slate-400">
                              @{suggestion.split("@")[1]}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                {login.isPasswordMode && (
                  <div className="animate-in slide-in-from-top-2 fade-in space-y-1.5">
                    <label className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <input
                        type={login.showPassword ? "text" : "password"}
                        value={login.password}
                        onChange={(e) => {
                          login.setPassword(e.target.value);
                          login.setError(null);
                        }}
                        className={cn(
                          "h-14 w-full rounded-xl border bg-slate-50 px-4 pr-12 text-lg transition-all outline-none dark:bg-slate-900",
                          login.error
                            ? "border-red-300"
                            : "border-transparent focus:border-slate-300 focus:bg-white dark:focus:bg-slate-950",
                        )}
                        placeholder={t("passwordPlaceholder")}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          login.setShowPassword(!login.showPassword)
                        }
                        className="absolute top-0 right-0 h-full px-4 text-slate-400"
                      >
                        {login.showPassword ? (
                          <EyeOff className="h-6 w-6" />
                        ) : (
                          <Eye className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Turnstile */}
                {TURNSTILE_SITE_KEY &&
                  !login.isPasswordMode &&
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email.trim()) && (
                    <MobileTurnstileWidget
                      onSuccess={login.setTurnstileToken}
                    />
                  )}

                {/* Error Message */}
                {login.error && (
                  <div className="animate-in slide-in-from-top-1 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    <div className="h-1 w-1 rounded-full bg-current" />
                    {login.error}
                  </div>
                )}

                {/* Submit Button - Flow Layout (Not fixed) */}
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={
                      login.isLoading ||
                      !login.email ||
                      (login.isPasswordMode && !login.password)
                    }
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                  >
                    {login.isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {login.isPasswordMode
                          ? t("signingIn")
                          : t("sendingCode")}
                      </>
                    ) : login.isPasswordMode ? (
                      t("login")
                    ) : (
                      t("sendEmailCode")
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============ View 3: Verification Code ============ */}
          {login.view === "email-code" && (
            <div className="animate-in zoom-in-95 flex flex-col items-center justify-center pt-10 pb-10 duration-500">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <KeyRound className="h-12 w-12" />
              </div>

              <h2 className="mb-3 text-center text-2xl font-bold">
                {t("enterCodeTitle")}
              </h2>
              <p className="mb-8 max-w-[280px] text-center text-slate-500">
                {t.rich("emailCodeSent", {
                  email: login.email,
                  bold: (chunks) => (
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {chunks}
                    </span>
                  ),
                })}
              </p>

              <form
                onSubmit={login.handleCodeFormSubmit}
                className="w-full space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("codeLabel")}
                  </label>
                  <input
                    type="text"
                    value={login.emailCode}
                    onChange={(e) =>
                      login.handleEmailCodeChange(e.target.value)
                    }
                    placeholder={t("codePlaceholder")}
                    className={cn(
                      "h-14 w-full rounded-xl border bg-slate-50 px-4 text-center text-2xl font-semibold tracking-[0.35em] transition-all outline-none dark:bg-slate-900",
                      login.error
                        ? "border-red-300 bg-red-50/50 focus:border-red-500"
                        : "border-transparent focus:border-slate-300 focus:bg-white dark:focus:border-slate-700 dark:focus:bg-slate-950",
                    )}
                    disabled={login.isLoading}
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                {login.error && (
                  <div className="animate-in slide-in-from-top-1 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    <div className="h-1 w-1 rounded-full bg-current" />
                    {login.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={login.isLoading || login.emailCode.length !== 6}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {login.isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("verifyingCode")}
                    </>
                  ) : (
                    t("verifyCode")
                  )}
                </button>
              </form>

              <div className="w-full space-y-4">
                {login.getEmailProvider(login.email) && (
                  <button
                    onClick={() =>
                      window.open(
                        login.getEmailProvider(login.email)?.url,
                        "_blank",
                      )
                    }
                    className="mt-5 h-12 w-full rounded-2xl bg-slate-100 text-base font-semibold text-slate-700 transition-all active:scale-[0.98] dark:bg-slate-900 dark:text-slate-200"
                  >
                    {t("openProvider", {
                      provider: login.getEmailProvider(login.email)?.name ?? "",
                    })}
                  </button>
                )}

                <button
                  onClick={login.handleResendCode}
                  disabled={login.isLoading}
                  className="w-full py-2 text-sm font-semibold text-slate-500 active:text-slate-900 disabled:opacity-50 dark:active:text-slate-200"
                >
                  {t("resendCode")}
                </button>

                <button
                  onClick={login.handleUseDifferentEmail}
                  className="w-full py-2 text-sm font-semibold text-slate-500 active:text-slate-900 dark:active:text-slate-200"
                >
                  {t("useDifferentEmail")}
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
