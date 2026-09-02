import { env } from "@/env";

/**
 * The site's public origin, used for sitemap, robots and social metadata.
 *
 * Falls back through the same chain the rest of the app uses for callback URLs
 * so a deployment only has to set one of them.
 */
export function getBaseUrl(): string {
  const configured = env.APP_URL ?? env.AUTH_URL ?? env.NEXTAUTH_URL;
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}
