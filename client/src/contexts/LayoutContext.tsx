import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  BREAKPOINTS,
  MEDIA_QUERIES,
  getIsMobileViewport,
  type LayoutMode,
} from '../constants/breakpoints';
import { LayoutContext, type LayoutContextValue } from './layoutContextValue';

function useMobileBreakpointSubscription(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => getIsMobileViewport());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERIES.mobile);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

interface LayoutProviderProps {
  children: ReactNode;
}

/**
 * Top-level layout provider that tracks the viewport against BREAKPOINTS.MOBILE
 * and publishes `data-layout="mobile" | "desktop"` on the root element so both
 * React components and CSS rules switch at the exact same breakpoint.
 */
export function LayoutProvider({ children }: LayoutProviderProps) {
  const isMobile = useMobileBreakpointSubscription();
  const layout: LayoutMode = isMobile ? 'mobile' : 'desktop';

  useLayoutEffect(() => {
    document.documentElement.dataset.layout = layout;
  }, [layout]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      layout,
      isMobile,
      isDesktop: !isMobile,
      breakpoint: BREAKPOINTS.MOBILE,
    }),
    [layout, isMobile]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
