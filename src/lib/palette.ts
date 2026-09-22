import fs from 'node:fs';
import path from 'node:path';
import { Vibrant } from 'node-vibrant/node';
import headerData from '../data/header.json';

/**
 * Build-time accent palette derived from the header banner image.
 *
 * The site is intentionally mostly white; these tokens are *subtle* accents.
 * We extract dominant colors from the banner at build time (no client JS, no
 * runtime cost — same build-time-image-read pattern as ArtCard), then soften
 * them heavily toward white and clamp saturation so nothing shouts.
 *
 * Four semantic tokens are produced:
 *   - accent:      primary accent (links, buttons, active nav) — the strongest,
 *                  still muted enough to sit on white with dark text elsewhere.
 *   - accentSoft:  a lighter tint of the primary for hovers / soft fills.
 *   - surfaceTint: a very faint wash for section backgrounds.
 *   - borderTint:  a hairline border color, barely tinted.
 *   - accentStrong: a muted, low-saturation tone for the thin landing hero
 *                  band — reads as a soft accent line, not a bold fill.
 *
 * When the banner is disabled/missing or extraction fails, we fall back to the
 * site's existing neutral palette so the look is unchanged.
 */
export interface AccentPalette {
  accent: string;
  accentSoft: string;
  surfaceTint: string;
  borderTint: string;
  accentStrong: string;
}

/** The site's current neutral look — used as the fallback. */
const NEUTRAL_FALLBACK: AccentPalette = {
  accent: '#111111',
  accentSoft: '#f5f5f5',
  surfaceTint: '#fafafa',
  borderTint: '#f0f0f0',
  accentStrong: '#d8d8d8',
};

type HSL = { h: number; s: number; l: number };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hslToCss({ h, s, l }: HSL): string {
  return `hsl(${Math.round(h)}, ${Math.round(clamp(s, 0, 100))}%, ${Math.round(clamp(l, 0, 100))}%)`;
}

/**
 * Soften a source HSL color into a subtle accent by capping saturation and
 * pushing lightness into a target band. Lower `strength` = closer to white.
 */
function soften(src: HSL, opts: { maxSat: number; targetL: number }): HSL {
  return {
    h: src.h,
    s: clamp(src.s, 0, opts.maxSat),
    l: opts.targetL,
  };
}

/**
 * Resolve the accent palette from the configured banner image.
 * Async because color extraction reads and decodes the image.
 */
export async function getAccentPalette(): Promise<AccentPalette> {
  const banner = headerData.banner;
  const enabled = banner?.enabled === true && Boolean(banner?.image);
  if (!enabled) return NEUTRAL_FALLBACK;

  // Only local public assets are supported for build-time extraction.
  const imagePath = banner.image;
  if (imagePath.startsWith('http')) return NEUTRAL_FALLBACK;

  const localPath = path.join(process.cwd(), 'public', imagePath);
  if (!fs.existsSync(localPath)) return NEUTRAL_FALLBACK;

  try {
    const palette = await Vibrant.from(localPath).getPalette();

    // Prefer a vivid-but-not-extreme source swatch for the primary accent,
    // falling back through the swatch set by availability.
    const primarySwatch =
      palette.Vibrant ||
      palette.Muted ||
      palette.DarkVibrant ||
      palette.LightVibrant ||
      palette.DarkMuted ||
      palette.LightMuted;

    if (!primarySwatch) return NEUTRAL_FALLBACK;

    const [h, s100, l100] = primarySwatch.hsl; // node-vibrant hsl is 0..1
    const src: HSL = { h: h * 360, s: s100 * 100, l: l100 * 100 };

    // Primary accent: readable on white, clearly tinted but muted.
    const accent = soften(src, { maxSat: 45, targetL: 42 });
    // Soft fill / hover: same hue, much lighter and gentler.
    const accentSoft = soften(src, { maxSat: 30, targetL: 92 });
    // Section wash: barely-there tint.
    const surfaceTint = soften(src, { maxSat: 18, targetL: 97 });
    // Hairline border: faint.
    const borderTint = soften(src, { maxSat: 14, targetL: 93 });
    // Muted, low-saturation fill for the thin landing hero band (subtle line).
    const accentStrong = soften(src, { maxSat: 22, targetL: 72 });

    return {
      accent: hslToCss(accent),
      accentSoft: hslToCss(accentSoft),
      surfaceTint: hslToCss(surfaceTint),
      borderTint: hslToCss(borderTint),
      accentStrong: hslToCss(accentStrong),
    };
  } catch {
    // Any decode/extraction failure -> keep the site neutral.
    return NEUTRAL_FALLBACK;
  }
}

export { NEUTRAL_FALLBACK };
