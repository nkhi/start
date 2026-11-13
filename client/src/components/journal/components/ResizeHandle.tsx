import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import styles from "./ResizeHandle.module.css";

interface ResizeHandleProps {
  axis?: "x" | "y";
  onResize: (ratio: number) => void;
  onReset: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function ResizeHandle({
  axis = "x",
  onResize,
  onReset,
  containerRef,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
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

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawRatio =
        axis === "y"
          ? (e.clientY - rect.top) / rect.height
          : (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0.25, Math.min(0.75, rawRatio));
      onResize(clamped);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, axis, onResize, containerRef]);

  return (
    <div
      className={`${styles.resizeHandle} ${axis === "y" ? styles.vertical : ""} ${isDragging ? styles.dragging : ""}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize, double-click to center (50/50)"
    >
      <div className={styles.resizeHandleBar} />
    </div>
  );
}
