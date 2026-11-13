import { useContext } from 'react';
import { LayoutContext, type LayoutContextValue } from '../contexts/layoutContextValue';

export { BREAKPOINTS, MOBILE_BREAKPOINT, MEDIA_QUERIES, type LayoutMode } from '../constants/breakpoints';
export type { LayoutContextValue };

/**
 * Access the current responsive layout state ('mobile' vs 'desktop').
 */
export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

/**
 * Convenience hook returning true when the viewport is at or below MOBILE_BREAKPOINT.
 */
export function useIsMobile(): boolean {
  return useLayout().isMobile;
}
