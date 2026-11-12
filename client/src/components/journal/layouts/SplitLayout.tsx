import { useEffect, useRef, useState, type ReactNode } from "react";
import { ResizeHandle } from "../components/ResizeHandle";
import styles from "./SplitLayout.module.css";

export type PaneMode = "garden" | "split" | "slate";

interface SplitLayoutProps {
  headerLeft: ReactNode;
  headerCenter: ReactNode;
  headerRight: ReactNode;
  left: ReactNode;
  right: ReactNode;
  mode: PaneMode;
  onModeChange: (mode: PaneMode) => void;
}

export function SplitLayout({
  headerLeft,
  headerCenter,
  headerRight,
  left,
  right,
  mode,
  onModeChange,
}: SplitLayoutProps) {
  const [ratio, setRatio] = useState<number>(0.5);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcuts: Cmd+1 (Garden), Cmd+2 (Split), Cmd+3 (Slate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          onModeChange("garden");
        } else if (e.key === "2") {
          e.preventDefault();
          onModeChange("split");
        } else if (e.key === "3") {
          e.preventDefault();
          onModeChange("slate");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onModeChange]);

  const leftWidth =
    mode === "garden" ? "100%" : mode === "slate" ? "0%" : `${ratio * 100}%`;
  const rightWidth =
    mode === "slate" ? "100%" : mode === "garden" ? "0%" : `${(1 - ratio) * 100}%`;

  return (
    <div className={styles.splitWorkspaceRoot}>
      {/* 48px Unified Shared Header above both panes */}
      <header className={styles.sharedHeaderBar}>
        <div className={`${styles.headerSection} ${styles.headerLeft}`}>
          {mode !== "slate" ? headerLeft : null}
        </div>

        <div className={`${styles.headerSection} ${styles.headerCenter}`}>
          {headerCenter}
        </div>

        <div className={`${styles.headerSection} ${styles.headerRight}`}>
          {mode !== "garden" ? headerRight : null}
        </div>
      </header>

      {/* Main Split Container filling remaining height (calc(100% - 48px)) */}
      <div className={`${styles.splitContainer} ${styles[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`] || ""}`} ref={containerRef}>
        {/* Left Pane (The Garden) */}
        <div
          className={`${styles.pane} ${styles.paneLeft}`}
          style={{
            width: leftWidth,
            display: mode === "slate" ? "none" : "block",
          }}
        >
          {left}
        </div>

        {/* Resizable Handle (split mode only) */}
        {mode === "split" && (
          <ResizeHandle
            onResize={setRatio}
            onReset={() => setRatio(0.5)}
            containerRef={containerRef}
          />
        )}

        {/* Right Pane (The Slate) */}
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
