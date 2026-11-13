import { createContext } from 'react';
import type { LayoutMode } from '../constants/breakpoints';

export interface LayoutContextValue {
  layout: LayoutMode;
  isMobile: boolean;
  isDesktop: boolean;
  breakpoint: number;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

