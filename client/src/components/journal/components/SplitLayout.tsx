import { useRef, useState, type ReactNode } from "react";
import { useJournal } from "../JournalContext";
import { useIsMobile } from "../../../hooks/useLayout";
import { ResizeHandle } from "./ResizeHandle";
import styles from "./SplitLayout.module.css";

export type PaneMode = "garden" | "split" | "slate";

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  const { mode } = useJournal();
  const isMobile = useIsMobile();
  const [ratio, setRatio] = useState<number>(0.5);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const firstSize = `${ratio * 100}%`;
  const secondSize = `${(1 - ratio) * 100}%`;

  // Desktop: left = Garden (firstSize), right = Slate (secondSize)
  // Mobile: top = Slate (firstSize), bottom = Garden (secondSize) via CSS order
  const leftSize =
    mode === "garden" ? "100%" : mode === "slate" ? "0%" : isMobile ? secondSize : firstSize;
  const rightSize =
    mode === "slate" ? "100%" : mode === "garden" ? "0%" : isMobile ? firstSize : secondSize;

  return (
    <div className={styles.splitWorkspaceRoot}>
      <div
        className={`${styles.splitContainer} ${styles[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`] || ""}`}
        ref={containerRef}
      >
        <div
          className={`${styles.pane} ${styles.paneLeft}`}
          style={{
            ...(isMobile ? { width: "100%", height: leftSize } : { width: leftSize }),
            display: mode === "slate" ? "none" : "block",
          }}
        >
          {left}
        </div>

        {mode === "split" && (
          <ResizeHandle
            axis={isMobile ? "y" : "x"}
            onResize={setRatio}
            onReset={() => setRatio(0.5)}
            containerRef={containerRef}
          />
        )}

        <div
          className={`${styles.pane} ${styles.paneRight}`}
          style={{
            ...(isMobile ? { width: "100%", height: rightSize } : { width: rightSize }),
            display: mode === "garden" ? "none" : "block",
          }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
