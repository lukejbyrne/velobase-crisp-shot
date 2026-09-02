import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // 禁止抓取静态资源（字体、JS、CSS 等）
          "/_next/static/",
          // 禁止抓取 API 路由
          "/api/",
          // 禁止抓取管理后台
          "/admin/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
