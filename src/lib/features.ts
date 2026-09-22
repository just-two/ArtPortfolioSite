import prodFeatures from '../data/features.prod.json';
import devFeatures from '../data/features.dev.json';

/**
 * JSON-driven, environment-aware feature flags.
 *
 * Flags live in per-environment files:
 *   - src/data/features.prod.json  (production, served at /)
 *   - src/data/features.dev.json   (staging, served at /dev/)
 *
 * The active set is chosen at build time by DEPLOY_ENV (set in the GitHub
 * Actions workflow). Because the site is fully static (SSG), flags are resolved
 * at build time and add zero client-side cost. Flip a value in the relevant
 * JSON file and rebuild to change behavior — no code changes required.
 */
export type FeatureFlags = Record<string, boolean>;

const DEPLOY_ENV = import.meta.env.DEPLOY_ENV || process.env.DEPLOY_ENV || 'prod';

/** All feature flags for the active environment. */
export const features: FeatureFlags = DEPLOY_ENV === 'dev' ? devFeatures : prodFeatures;

/**
 * Read a single flag by name.
 *
 * @param name         The flag key in the active features file.
 * @param defaultValue Returned when the flag is missing (default: false).
 */
export function getFeature(name: string, defaultValue = false): boolean {
  return name in features ? features[name] : defaultValue;
}

/**
 * Whether commerce (Stripe "Buy Now" checkout) is enabled.
 * Prod: true. Dev: false -> purchasable works fall back to an "Inquire" mailto.
 */
export const commerceEnabled = getFeature('commerceEnabled', false);
