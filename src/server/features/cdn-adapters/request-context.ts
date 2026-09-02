/**
 * CDN 适配 — 请求上下文提取
 *
 * 从 HTTP 请求头中提取部署环境提供的上下文信息（IP、国家、SSL 模式）。
 * 支持多种部署环境（Cloudflare / Vercel / Nginx / 裸部署），通过 fallback 链自动适配。
 *
 * AI：这个文件是框架核心基础设施，一般不需要修改。
 * 如需添加新的 CDN 提供商支持，在 fallback 链中添加对应的 header 名即可。
 */

// ─── IP 提取 ────────────────────────────────────────────────────────

/**
 * 从请求头提取客户端真实 IP。
 *
 * 优先级（越靠前越可信）：
 * 1. CF-Connecting-IP — Cloudflare 注入，不可伪造
 * 2. X-Real-IP — Nginx 等反向代理设置
 * 3. X-Forwarded-For — 标准代理头，取第一个（客户端 IP）
 */
export function getClientIpFromHeaders(headers: Headers): string {
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return 'unknown';
}

/** 从 Request 对象提取客户端 IP */
export function getClientIp(req: Request): string {
  return getClientIpFromHeaders(req.headers);
}

/**
 * 获取所有 IP 相关 header 用于调试。
 */
export function getIpDebugInfo(headers: Headers): Record<string, string | null> {
  return {
    'cf-connecting-ip': headers.get('cf-connecting-ip'),
    'x-real-ip': headers.get('x-real-ip'),
    'x-forwarded-for': headers.get('x-forwarded-for'),
    'resolved-ip': getClientIpFromHeaders(headers),
  };
}

/**
 * 标准化 IP 用于限速（IPv6 截取 /64 网段）。
 *
 * @example
 * normalizeIpForRateLimit('2607:a400:c:44c:73b:dfba:6cdd:542c') // '2607:a400:c:44c'
 * normalizeIpForRateLimit('107.151.158.76') // '107.151.158.76'
 */
export function normalizeIpForRateLimit(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';

  if (ip.includes(':')) {
    const segments = ip.split(':');
    if (segments.length >= 4) {
      return segments.slice(0, 4).join(':');
    }
    return ip;
  }

  return ip;
}

// ─── 国家提取 ───────────────────────────────────────────────────────

/**
 * 从请求头提取客户端国家代码（ISO 3166-1 alpha-2）。
 *
 * 优先级：
 * 1. CF-IPCountry — Cloudflare 注入
 * 2. x-vercel-ip-country — Vercel 注入
 * 3. x-country-code / x-country — 通用代理
 *
 * @returns 如 "CN"、"US"、"JP"，无法确定时返回 undefined
 */
export function getClientCountryFromHeaders(headers?: Headers | null): string | undefined {
  if (!headers) return undefined;

  const raw =
    headers.get('cf-ipcountry') ??
    headers.get('x-vercel-ip-country') ??
    headers.get('x-country-code') ??
    headers.get('x-country') ??
    undefined;

  if (!raw) return undefined;
  const cc = raw.trim().toUpperCase();
  if (!cc || cc === 'XX' || cc === 'UNKNOWN') return undefined;
  if (cc.length !== 2) return undefined;
  return cc;
}

// ─── Flexible SSL 检测 ──────────────────────────────────────────────

/**
 * 检测当前请求是否处于 Cloudflare Flexible SSL 模式。
 *
 * Flexible SSL: 用户 → HTTPS → Cloudflare → HTTP → 源站
 *
 * 判断逻辑：
 * - CF-Visitor 存在且 scheme=https → 说明用户通过 HTTPS 访问
 * - 源站实际收到 HTTP（X-Forwarded-Proto=https 但无直接 TLS）
 * - 有 CF-Connecting-IP → 确认在 Cloudflare 代理后面
 *
 * 如果没有 Cloudflare 代理头，返回 false（视为非 Flexible SSL 环境）。
 */
export function isFlexibleSSL(headers: Headers): boolean {
  const hasCfProxy = !!headers.get('cf-connecting-ip');
  if (!hasCfProxy) return false;

  const cfVisitor = headers.get('cf-visitor');
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: string };
      if (parsed.scheme === 'https') {
        return true;
      }
    } catch {
      // malformed CF-Visitor, fall through
    }
  }

  const proto = headers.get('x-forwarded-proto');
  if (proto?.toLowerCase() === 'https') {
    return true;
  }

  return false;
}

/**
 * 根据请求头动态决定 cookie 的 secure 属性。
 *
 * - Flexible SSL 模式 → secure: false（源站是 HTTP，secure cookie 无法设置）
 * - 生产环境直连 HTTPS → secure: true
 * - 开发环境（localhost）→ secure: false
 */
export function shouldCookieBeSecure(headers?: Headers | null): boolean {
  if (!headers) {
    return process.env.NODE_ENV === 'production';
  }

  if (isFlexibleSSL(headers)) {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}
