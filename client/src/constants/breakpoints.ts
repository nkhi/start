/**
 * Centralized responsive layout breakpoints.
 * All values in pixels.
 *
 * Designed for two primary layouts:
 * - desktop: standard wide viewport
 * - mobile: narrow viewport (e.g. Pixel 9a ~412px CSS width in portrait)
 */
export const BREAKPOINTS = {
  /** Maximum viewport width (px) treated as mobile layout */
  MOBILE: 768,
} as const;

export const MOBILE_BREAKPOINT = BREAKPOINTS.MOBILE;

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.MOBILE}px)`,
} as const;

export type LayoutMode = 'mobile' | 'desktop';

/**
 * Synchronously checks whether the current viewport matches the mobile breakpoint.
 */
export function getIsMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MEDIA_QUERIES.mobile).matches;
}

/**
 * Returns the active layout mode ('mobile' | 'desktop') for the current viewport.
 */
export function getLayoutMode(): LayoutMode {
  return getIsMobileViewport() ? 'mobile' : 'desktop';
}

