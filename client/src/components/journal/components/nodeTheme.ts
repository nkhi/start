export interface OpennessColors {
  bg: string;
  border: string;
  accent: string;
}

/**
 * Maps openness (1..10) to a subtle sage-to-terracotta surface tint, border, and accent.
 */
export function getOpennessColors(openness: number): OpennessColors {
  const norm = Math.max(0, Math.min(1, (openness - 1) / 9));
  // Cool sage: (124, 154, 142) -> Warm terracotta: (217, 119, 87)
  const r = Math.round(124 + norm * (217 - 124));
  const g = Math.round(154 - norm * (154 - 119));
  const b = Math.round(142 - norm * (142 - 87));

  return {
    bg: `rgba(${r}, ${g}, ${b}, ${0.05 + norm * 0.06})`,
    border: `rgba(${r}, ${g}, ${b}, ${0.24 + norm * 0.22})`,
    accent: `rgb(${r}, ${g}, ${b})`,
  };
}

