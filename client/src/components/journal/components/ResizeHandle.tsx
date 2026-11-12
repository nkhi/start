import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import styles from "./ResizeHandle.module.css";

interface ResizeHandleProps {
  onResize: (ratio: number) => void;
  onReset: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function ResizeHandle({
  onResize,
  onReset,
  containerRef,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDoubleClick = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      onReset();
    },
    [onReset],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawRatio = (e.clientX - rect.left) / rect.width;
      // Clamp ratio between 25% and 75%
      const clamped = Math.max(0.25, Math.min(0.75, rawRatio));
      onResize(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize, containerRef]);

  return (
    <div
      className={`${styles.resizeHandle} ${isDragging ? styles.dragging : ""}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize, double-click to center (50/50)"
    >
      <div className={styles.resizeHandleBar} />
    </div>
  );
}
