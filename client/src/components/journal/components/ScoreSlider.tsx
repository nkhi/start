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

export interface ThoughtScores {
  priority: number;
  intensity: number;
  openness: number;
}

const SCORE_FIELDS: ReadonlyArray<{
  key: keyof ThoughtScores;
  label: string;
  minLabel: string;
  maxLabel: string;
  color: string;
}> = [
  {
    key: "priority",
    label: "Priority",
    minLabel: "1 (Backburner)",
    maxLabel: "10 (Urgent)",
    color: "var(--ink)",
  },
  {
    key: "intensity",
    label: "Intensity",
    minLabel: "1 (Quiet)",
    maxLabel: "10 (Heavy)",
    color: "var(--warm)",
  },
  {
    key: "openness",
    label: "Openness",
    minLabel: "1 (Resolved)",
    maxLabel: "10 (Wide Open)",
    color: "var(--accent)",
  },
];

export function ThoughtScoreSliders({
  scores,
  onChange,
}: {
  scores: ThoughtScores;
  onChange: (field: keyof ThoughtScores, value: number) => void;
}) {
  return (
    <>
      {SCORE_FIELDS.map(({ key, label, minLabel, maxLabel, color }) => (
        <ScoreSlider
          key={key}
          label={label}
          value={scores[key]}
          onChange={(val) => onChange(key, val)}
          minLabel={minLabel}
          maxLabel={maxLabel}
          color={color}
        />
      ))}
    </>
  );
}
