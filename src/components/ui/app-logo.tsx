import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config/brand";
import { Logo } from "./logo";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal";
}

const logoSizeMap = {
  sm: "sm" as const,
  md: "sm" as const,
  lg: "md" as const,
};

const textClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * Splits the brand name so the second half renders muted, e.g. "Crisp" + "Shot".
 * Falls back to the whole name when there is no obvious split point.
 */
const wordmark = splitWordmark(APP_NAME);

function splitWordmark(name: string): { lead: string; trail: string } {
  const spaced = name.split(" ");
  if (spaced.length > 1) {
    return { lead: spaced[0]!, trail: ` ${spaced.slice(1).join(" ")}` };
  }
  const camel = /^([A-Z][a-z0-9]+)([A-Z].*)$/.exec(name);
  if (camel) return { lead: camel[1]!, trail: camel[2]! };
  return { lead: name, trail: "" };
}

export function AppLogo({ className, size = "md", variant = "default" }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-2 font-poppins group", className)}>
      <Logo size={logoSizeMap[size]} className="text-primary" />
      {variant === "default" && (
        <div className={cn("font-bold tracking-tight leading-none flex items-center", textClasses[size])}>
          <span className="text-foreground">{wordmark.lead}</span>
          {wordmark.trail && (
            <span className="text-foreground/40 font-medium">
              {wordmark.trail}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
