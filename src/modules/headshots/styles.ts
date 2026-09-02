/**
 * Professional headshot style catalogue.
 *
 * Styles are product configuration rather than user data, so they live in code:
 * adding a style is a deploy, not a migration. Only `key` is persisted on a
 * batch, so renaming a label is safe but changing a key is not.
 */

export interface HeadshotStyle {
  /** Stable identifier persisted on HeadshotBatch.styleKey. Never rename. */
  key: string;
  /** i18n key suffix under the `headshots.styles` namespace. */
  labelKey: string;
  /** Instruction appended to the shared base prompt. */
  prompt: string;
  /** Accent used behind a sample image while it loads. */
  accentClassName: string;
  /** Real sample rendered by this style, served from /public/landing. */
  sampleImage: string;
}

/**
 * Shared instruction applied to every style. Kept deliberately conservative:
 * the product promise is "the same person, better presented", so identity
 * preservation outranks stylistic flourish.
 */
export const HEADSHOT_BASE_PROMPT = [
  "Retouch this photograph into a professional business headshot of the same person.",
  "Preserve the subject's identity exactly: same face shape, bone structure, eye colour,",
  "skin tone, hair and apparent age. Do not beautify, slim, lighten or otherwise alter",
  "their features. Frame head and shoulders, eyes on the upper third, sharp focus on the",
  "eyes, natural skin texture retained, no visible retouching artefacts, no text,",
  "no watermark, no logo, no additional people.",
].join(" ");

export const HEADSHOT_NEGATIVE_PROMPT = [
  "cartoon, illustration, 3d render, plastic skin, over-smoothed skin, distorted face,",
  "extra fingers, extra people, text, watermark, logo, heavy vignette, low resolution",
].join(" ");

export const HEADSHOT_STYLES: readonly HeadshotStyle[] = [
  {
    key: "corporate",
    sampleImage: "/landing/corporate.jpg",
    labelKey: "corporate",
    prompt:
      "Corporate studio portrait. Charcoal suit jacket over a crisp white shirt, neutral " +
      "mid-grey seamless backdrop, soft key light from the front left with a gentle fill, " +
      "confident closed-mouth smile, cool neutral colour grade.",
    accentClassName: "from-slate-500 to-slate-700",
  },
  {
    key: "startup-founder",
    sampleImage: "/landing/startup-founder.jpg",
    labelKey: "startupFounder",
    prompt:
      "Modern founder portrait. Plain dark crew-neck or knit over relaxed shoulders, " +
      "softly blurred bright office interior behind, large window light from the side, " +
      "warm approachable expression, clean contemporary colour grade.",
    accentClassName: "from-indigo-500 to-violet-600",
  },
  {
    key: "linkedin-classic",
    sampleImage: "/landing/linkedin-classic.jpg",
    labelKey: "linkedinClassic",
    prompt:
      "Classic LinkedIn profile photo. Navy blazer over a light open-collar shirt, " +
      "clean light-grey backdrop, even flattering three-point studio lighting, " +
      "friendly professional smile, true-to-life colour.",
    accentClassName: "from-sky-500 to-blue-600",
  },
  {
    key: "creative",
    sampleImage: "/landing/creative.jpg",
    labelKey: "creative",
    prompt:
      "Editorial creative portrait. Textured dark top, deep muted teal backdrop, " +
      "directional soft light with controlled shadow falloff on one side, " +
      "calm considered expression, rich cinematic colour grade.",
    accentClassName: "from-teal-500 to-emerald-600",
  },
  {
    key: "outdoor-natural",
    sampleImage: "/landing/outdoor-natural.jpg",
    labelKey: "outdoorNatural",
    prompt:
      "Natural light outdoor portrait. Smart casual shirt or light jacket, " +
      "softly defocused green park foliage behind, late-afternoon golden light, " +
      "relaxed genuine smile, warm natural colour grade.",
    accentClassName: "from-amber-500 to-orange-600",
  },
  {
    key: "monochrome",
    sampleImage: "/landing/monochrome.jpg",
    labelKey: "monochrome",
    prompt:
      "Timeless black and white portrait. Simple dark clothing, plain dark backdrop, " +
      "single soft key light with deep controlled contrast, composed neutral expression, " +
      "fine-grain monochrome film look.",
    accentClassName: "from-zinc-500 to-neutral-700",
  },
] as const;

const STYLE_BY_KEY = new Map(
  HEADSHOT_STYLES.map((style) => [style.key, style]),
);

export const HEADSHOT_STYLE_KEYS = HEADSHOT_STYLES.map(
  (style) => style.key,
) as [string, ...string[]];

export function getHeadshotStyle(key: string): HeadshotStyle | undefined {
  return STYLE_BY_KEY.get(key);
}

export function isHeadshotStyleKey(key: string): boolean {
  return STYLE_BY_KEY.has(key);
}

/**
 * Builds the generation prompt for one image in a batch.
 *
 * `position` is folded in so the four images in a batch are varied rather than
 * four attempts at the identical frame — the same reason a real photographer
 * shoots several setups in one session.
 */
export function buildHeadshotPrompt(
  styleKey: string,
  position: number,
): string {
  const style = getHeadshotStyle(styleKey);
  if (!style) {
    throw new Error(`Unknown headshot style: ${styleKey}`);
  }

  const variations = [
    "Straight-on framing, shoulders square to camera.",
    "Body angled slightly to camera left, head turned back to camera.",
    "Tighter crop from just below the shoulders, chin marginally lowered.",
    "Body angled slightly to camera right, a touch more headroom above the hair.",
  ];
  const variation = variations[position % variations.length] ?? variations[0]!;

  return `${HEADSHOT_BASE_PROMPT} ${style.prompt} ${variation}`;
}

/**
 * Maps a persisted kebab-case style key to its camelCase i18n label key.
 * Safe to call from client components — the catalogue is plain data.
 */
export function styleLabelKey(styleKey: string): string {
  return getHeadshotStyle(styleKey)?.labelKey ?? HEADSHOT_STYLES[0]!.labelKey;
}

/**
 * Assigns a style to each image slot in a batch.
 *
 * Picks cycle round-robin, so four picks give four different looks and one
 * pick gives four takes on the same one. Cycling rather than blocking keeps
 * an uneven split even — three picks over four slots gives the first pick the
 * extra image rather than dropping a style.
 */
export function assignStylesToSlots(
  styleKeys: string[],
  slots: number,
): string[] {
  if (styleKeys.length === 0) throw new Error("At least one style is required");
  return Array.from(
    { length: slots },
    (_, index) => styleKeys[index % styleKeys.length]!,
  );
}
