/**
 * CDN Adapters Feature Test
 *
 * 测试 CDN 适配功能的所有纯函数逻辑：
 * - IP 提取（Cloudflare / Nginx / X-Forwarded-For / 无代理）
 * - 国家提取（Cloudflare / Vercel / 通用代理）
 * - IPv6 限速标准化
 * - Flexible SSL 检测
 * - Cookie secure 动态决定
 *
 * 纯函数测试，不依赖外部服务。
 *
 * Usage: npx tsx scripts/tests/features/cdn-adapters/test-cdn-adapters.ts
 */

import {
  getClientIpFromHeaders,
  getClientIp,
  getIpDebugInfo,
  normalizeIpForRateLimit,
  getClientCountryFromHeaders,
  isFlexibleSSL,
  shouldCookieBeSecure,
} from '../../../../src/server/features/cdn-adapters'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function makeHeaders(map: Record<string, string>): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(map)) {
    h.set(k, v)
  }
  return h
}

// ═══════════════════════════════════════════════════════════════
// 1. IP 提取
// ═══════════════════════════════════════════════════════════════

function testIpExtraction() {
  console.log('\n═══ 1. IP 提取优先级 ═══\n')

  // 1.1 Cloudflare CF-Connecting-IP 优先
  const cf = makeHeaders({
    'cf-connecting-ip': '203.0.113.45',
    'x-real-ip': '10.0.0.1',
    'x-forwarded-for': '192.168.1.1, 10.0.0.1',
  })
  assert(getClientIpFromHeaders(cf) === '203.0.113.45', 'CF-Connecting-IP 优先于所有其他 header')

  // 1.2 Nginx X-Real-IP fallback
  const nginx = makeHeaders({ 'x-real-ip': '172.16.0.50' })
  assert(getClientIpFromHeaders(nginx) === '172.16.0.50', 'X-Real-IP 作为 fallback')

  // 1.3 X-Forwarded-For 取第一个
  const proxy = makeHeaders({ 'x-forwarded-for': '8.8.8.8, 10.0.0.1, 172.16.0.1' })
  assert(getClientIpFromHeaders(proxy) === '8.8.8.8', 'X-Forwarded-For 取第一个 IP')

  // 1.4 X-Forwarded-For 单个 IP
  const singleProxy = makeHeaders({ 'x-forwarded-for': '1.2.3.4' })
  assert(getClientIpFromHeaders(singleProxy) === '1.2.3.4', 'X-Forwarded-For 单 IP')

  // 1.5 无代理头 → unknown
  const empty = makeHeaders({})
  assert(getClientIpFromHeaders(empty) === 'unknown', '无代理头返回 unknown')

  // 1.6 带空格的值自动 trim
  const spacey = makeHeaders({ 'cf-connecting-ip': '  203.0.113.45  ' })
  assert(getClientIpFromHeaders(spacey) === '203.0.113.45', 'IP 值自动 trim')

  // 1.7 getClientIp(Request) 包装
  const req = new Request('http://localhost', { headers: makeHeaders({ 'x-real-ip': '9.9.9.9' }) })
  assert(getClientIp(req) === '9.9.9.9', 'getClientIp(Request) 正确包装')
}

// ═══════════════════════════════════════════════════════════════
// 2. IP Debug Info
// ═══════════════════════════════════════════════════════════════

function testIpDebugInfo() {
  console.log('\n═══ 2. IP Debug Info ═══\n')

  const h = makeHeaders({
    'cf-connecting-ip': '1.1.1.1',
    'x-forwarded-for': '2.2.2.2',
  })
  const info = getIpDebugInfo(h)

  assert(info['cf-connecting-ip'] === '1.1.1.1', 'debug info 包含 cf-connecting-ip')
  assert(info['x-forwarded-for'] === '2.2.2.2', 'debug info 包含 x-forwarded-for')
  assert(info['x-real-ip'] === null, 'debug info 缺失 header 返回 null')
  assert(info['resolved-ip'] === '1.1.1.1', 'debug info resolved-ip 是最终结果')
}

// ═══════════════════════════════════════════════════════════════
// 3. IPv6 限速标准化
// ═══════════════════════════════════════════════════════════════

function testIpNormalization() {
  console.log('\n═══ 3. IPv6 限速标准化 ═══\n')

  assert(
    normalizeIpForRateLimit('2607:a400:c:44c:73b:dfba:6cdd:542c') === '2607:a400:c:44c',
    'IPv6 截取 /64 (前4段)'
  )

  assert(
    normalizeIpForRateLimit('107.151.158.76') === '107.151.158.76',
    'IPv4 保持不变'
  )

  assert(normalizeIpForRateLimit('unknown') === 'unknown', 'unknown 保持不变')
  assert(normalizeIpForRateLimit('') === 'unknown', '空字符串返回 unknown')

  // 短 IPv6（不足4段）保持不变
  assert(normalizeIpForRateLimit('::1') === '::1', '短 IPv6 (loopback) 保持不变')
}

// ═══════════════════════════════════════════════════════════════
// 4. 国家提取
// ═══════════════════════════════════════════════════════════════

function testCountryExtraction() {
  console.log('\n═══ 4. 国家代码提取 ═══\n')

  // 4.1 Cloudflare CF-IPCountry
  const cf = makeHeaders({ 'cf-ipcountry': 'CN' })
  assert(getClientCountryFromHeaders(cf) === 'CN', 'CF-IPCountry → CN')

  // 4.2 Vercel
  const vercel = makeHeaders({ 'x-vercel-ip-country': 'US' })
  assert(getClientCountryFromHeaders(vercel) === 'US', 'x-vercel-ip-country → US')

  // 4.3 通用代理
  const generic = makeHeaders({ 'x-country-code': 'jp' })
  assert(getClientCountryFromHeaders(generic) === 'JP', 'x-country-code 自动大写 → JP')

  // 4.4 CF 优先于 Vercel
  const both = makeHeaders({ 'cf-ipcountry': 'DE', 'x-vercel-ip-country': 'FR' })
  assert(getClientCountryFromHeaders(both) === 'DE', 'CF-IPCountry 优先于 Vercel')

  // 4.5 无 header
  assert(getClientCountryFromHeaders(makeHeaders({})) === undefined, '无 header 返回 undefined')

  // 4.6 null headers
  assert(getClientCountryFromHeaders(null) === undefined, 'null 返回 undefined')
  assert(getClientCountryFromHeaders(undefined) === undefined, 'undefined 返回 undefined')

  // 4.7 特殊值过滤
  assert(getClientCountryFromHeaders(makeHeaders({ 'cf-ipcountry': 'XX' })) === undefined, 'XX 过滤为 undefined')
  assert(getClientCountryFromHeaders(makeHeaders({ 'cf-ipcountry': 'UNKNOWN' })) === undefined, 'UNKNOWN 过滤')
  assert(getClientCountryFromHeaders(makeHeaders({ 'cf-ipcountry': 'USA' })) === undefined, '3字符非 alpha-2 过滤')
}

// ═══════════════════════════════════════════════════════════════
// 5. Flexible SSL 检测
// ═══════════════════════════════════════════════════════════════

function testFlexibleSSL() {
  console.log('\n═══ 5. Flexible SSL 检测 ═══\n')

  // 5.1 经典 Flexible SSL：CF 代理 + CF-Visitor scheme=https
  const flexible = makeHeaders({
    'cf-connecting-ip': '1.2.3.4',
    'cf-visitor': '{"scheme":"https"}',
  })
  assert(isFlexibleSSL(flexible) === true, 'CF-Visitor scheme=https → Flexible SSL')

  // 5.2 CF 代理 + X-Forwarded-Proto=https（无 CF-Visitor）
  const flexibleProto = makeHeaders({
    'cf-connecting-ip': '1.2.3.4',
    'x-forwarded-proto': 'https',
  })
  assert(isFlexibleSSL(flexibleProto) === true, 'X-Forwarded-Proto=https → Flexible SSL')

  // 5.3 无 CF 代理 → false（即使有 X-Forwarded-Proto）
  const noProxy = makeHeaders({ 'x-forwarded-proto': 'https' })
  assert(isFlexibleSSL(noProxy) === false, '无 CF-Connecting-IP → 非 Flexible')

  // 5.4 CF 代理但 scheme=http（Full SSL 或直连）
  const fullSSL = makeHeaders({
    'cf-connecting-ip': '1.2.3.4',
    'cf-visitor': '{"scheme":"http"}',
  })
  assert(isFlexibleSSL(fullSSL) === false, 'CF-Visitor scheme=http → 非 Flexible')

  // 5.5 无任何代理头
  assert(isFlexibleSSL(makeHeaders({})) === false, '无代理头 → 非 Flexible')

  // 5.6 CF 代理但无 proto 信息
  const cfOnly = makeHeaders({ 'cf-connecting-ip': '1.2.3.4' })
  assert(isFlexibleSSL(cfOnly) === false, 'CF 代理但无 proto → 非 Flexible')

  // 5.7 CF-Visitor 格式错误
  const badVisitor = makeHeaders({
    'cf-connecting-ip': '1.2.3.4',
    'cf-visitor': 'not-json',
  })
  assert(isFlexibleSSL(badVisitor) === false, 'CF-Visitor 格式错误 → 安全降级为非 Flexible')
}

// ═══════════════════════════════════════════════════════════════
// 6. Cookie Secure 动态决定
// ═══════════════════════════════════════════════════════════════

function testCookieSecure() {
  console.log('\n═══ 6. Cookie Secure 动态决定 ═══\n')

  const origEnv = process.env.NODE_ENV

  // 6.1 开发环境无 header → false
  process.env.NODE_ENV = 'development'
  assert(shouldCookieBeSecure(null) === false, '开发环境 + null headers → false')

  // 6.2 生产环境无 header → true
  process.env.NODE_ENV = 'production'
  assert(shouldCookieBeSecure(null) === true, '生产环境 + null headers → true')

  // 6.3 Flexible SSL → false（即使生产环境）
  process.env.NODE_ENV = 'production'
  const flexHeaders = makeHeaders({
    'cf-connecting-ip': '1.2.3.4',
    'cf-visitor': '{"scheme":"https"}',
  })
  assert(shouldCookieBeSecure(flexHeaders) === false, '生产 + Flexible SSL → false')

  // 6.4 生产 + 非 Flexible → true
  process.env.NODE_ENV = 'production'
  assert(shouldCookieBeSecure(makeHeaders({})) === true, '生产 + 无代理 → true')

  process.env.NODE_ENV = origEnv
}

// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  CDN 适配功能测试 (CDN Adapters)')
  console.log('═══════════════════════════════════════════')

  testIpExtraction()
  testIpDebugInfo()
  testIpNormalization()
  testCountryExtraction()
  testFlexibleSSL()
  testCookieSecure()

  console.log(`\n${'═'.repeat(43)}`)
  console.log(`  结果: ${passed} passed, ${failed} failed`)
  console.log(`${'═'.repeat(43)}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main()
