import featuresJson from '../data/features.json';

/**
 * JSON-driven feature flags.
 *
 * Flags live in `src/data/features.json` as a flat map of name -> boolean.
 * Because the site is fully static (SSG), flags are resolved at build time and
 * add zero client-side cost. Flip a value in the JSON and rebuild to change
 * behavior — no code changes required.
 */
export type FeatureFlags = Record<string, boolean>;

/** All feature flags, as loaded from features.json. */
export const features: FeatureFlags = featuresJson;

/**
 * Read a single flag by name.
 *
 * @param name         The flag key in features.json.
 * @param defaultValue Returned when the flag is missing (default: false).
 */
export function getFeature(name: string, defaultValue = false): boolean {
  return name in features ? features[name] : defaultValue;
}

/**
 * Whether commerce (Stripe "Buy Now" checkout) is enabled.
 * When false, purchasable works fall back to an "Inquire" mailto action.
 */
export const commerceEnabled = getFeature('commerceEnabled', false);
