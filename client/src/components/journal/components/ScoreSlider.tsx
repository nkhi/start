import styles from "./ScoreSlider.module.css";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  minLabel?: string;
  maxLabel?: string;
  color?: string;
}

export function ScoreSlider({
  label,
  value,
  onChange,
  minLabel = "1",
  maxLabel = "10",
  color = "var(--accent)",
}: ScoreSliderProps) {
  return (
    <div className={styles.scoreSlider}>
      <div className={styles.scoreSliderHeader}>
        <span className={styles.scoreSliderLabel}>{label}</span>
        <span className={styles.scoreSliderVal} style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={styles.scoreRangeInput}
        style={{ accentColor: color }}
      />
      <div className={styles.scoreSliderBounds}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
