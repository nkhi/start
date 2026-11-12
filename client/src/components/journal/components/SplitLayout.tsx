import { useRef, useState, type ReactNode } from "react";
import { useJournal } from "../JournalContext";
import { ResizeHandle } from "./ResizeHandle";
import styles from "./SplitLayout.module.css";

export type PaneMode = "garden" | "split" | "slate";

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  const { mode } = useJournal();
  const [ratio, setRatio] = useState<number>(0.5);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const leftWidth =
    mode === "garden" ? "100%" : mode === "slate" ? "0%" : `${ratio * 100}%`;
  const rightWidth =
    mode === "slate" ? "100%" : mode === "garden" ? "0%" : `${(1 - ratio) * 100}%`;

  return (
    <div className={styles.splitWorkspaceRoot}>
      <div
        className={`${styles.splitContainer} ${styles[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`] || ""}`}
        ref={containerRef}
      >
        <div
          className={`${styles.pane} ${styles.paneLeft}`}
          style={{
            width: leftWidth,
            display: mode === "slate" ? "none" : "block",
          }}
        >
          {left}
        </div>

        {mode === "split" && (
          <ResizeHandle
            onResize={setRatio}
            onReset={() => setRatio(0.5)}
            containerRef={containerRef}
          />
        )}

        <div
          className={`${styles.pane} ${styles.paneRight}`}
          style={{
            width: rightWidth,
            display: mode === "garden" ? "none" : "block",
          }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
