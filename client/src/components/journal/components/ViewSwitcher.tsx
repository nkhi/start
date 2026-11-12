import { useEffect, useRef, useState } from "react";
import type { PaneMode } from "../layouts/SplitLayout";
import styles from "./ViewSwitcher.module.css";

interface ViewSwitcherProps {
  mode: PaneMode;
  onChange: (mode: PaneMode) => void;
}

export function ViewSwitcher({ mode, onChange }: ViewSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const getIcon = (targetMode: PaneMode) => {
    switch (targetMode) {
      case "garden":
        return (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path
              d="M1.5 2.5A1 1 0 0 1 2.5 1.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11zm1 0v11h4v-11h-4zm5 0v11h6a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-6z"
              opacity="0.25"
            />
            <path d="M2.5 1.5A1 1 0 0 0 1.5 2.5v11a1 1 0 0 0 1 1h4v-13h-4z" />
          </svg>
        );
      case "slate":
        return (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path
              d="M1.5 2.5A1 1 0 0 1 2.5 1.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11zm1 0v11h4v-11h-4zm5 0v11h6a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-6z"
              opacity="0.25"
            />
            <path d="M8.5 1.5v13h5a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1h-5z" />
          </svg>
        );
      case "split":
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M1.5 2.5A1 1 0 0 1 2.5 1.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11zm6 0v11h6a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-6zm-1 0h-4a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h4v-11z" />
          </svg>
        );
    }
  };

  const getLabel = (targetMode: PaneMode) => {
    switch (targetMode) {
      case "garden":
        return "Garden";
      case "slate":
        return "Slate";
      case "split":
      default:
        return "Split";
    }
  };

  return (
    <div className={styles.viewSwitcherWrap} ref={containerRef}>
      <button
        className={styles.btnViewSwitcher}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Current view: ${getLabel(mode)}. Click to change view.`}
        aria-label="Toggle Workspace View"
        aria-expanded={isOpen}
      >
        <span className={styles.viewSwitcherIcon}>{getIcon(mode)}</span>
      </button>

      {isOpen && (
        <div className={styles.viewDropdownMenu} role="menu">
          <button
            className={`${styles.viewDropdownItem} ${mode === "garden" ? styles.activeItem : ""}`}
            onClick={() => {
              onChange("garden");
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <span className={styles.itemIcon}>{getIcon("garden")}</span>
            <span className={styles.itemTitle}>Garden Only</span>
            <span className={styles.itemShortcut}>⌘1</span>
          </button>

          <button
            className={`${styles.viewDropdownItem} ${mode === "split" ? styles.activeItem : ""}`}
            onClick={() => {
              onChange("split");
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <span className={styles.itemIcon}>{getIcon("split")}</span>
            <span className={styles.itemTitle}>Split View</span>
            <span className={styles.itemShortcut}>⌘2</span>
          </button>

          <button
            className={`${styles.viewDropdownItem} ${mode === "slate" ? styles.activeItem : ""}`}
            onClick={() => {
              onChange("slate");
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <span className={styles.itemIcon}>{getIcon("slate")}</span>
            <span className={styles.itemTitle}>Slate Only</span>
            <span className={styles.itemShortcut}>⌘3</span>
          </button>
        </div>
      )}
    </div>
  );
}

