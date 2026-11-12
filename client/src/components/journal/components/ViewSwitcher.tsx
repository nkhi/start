import { useEffect, useRef, useState } from "react";
import {
  SquareHalfIcon,
  SquareSplitHorizontalIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { PaneMode } from "../layouts/SplitLayout";
import styles from "./ViewSwitcher.module.css";

interface ViewSwitcherProps {
  mode: PaneMode;
  onChange: (mode: PaneMode) => void;
}

const VIEW_OPTIONS: ReadonlyArray<{
  id: PaneMode;
  label: string;
  menuTitle: string;
  shortcut: string;
  Icon: Icon;
  rotated?: boolean;
}> = [
  {
    id: "garden",
    label: "Garden",
    menuTitle: "Garden Only",
    shortcut: "⌘1",
    Icon: SquareHalfIcon,
    rotated: true,
  },
  {
    id: "split",
    label: "Split",
    menuTitle: "Split View",
    shortcut: "⌘2",
    Icon: SquareSplitHorizontalIcon,
  },
  {
    id: "slate",
    label: "Slate",
    menuTitle: "Slate Only",
    shortcut: "⌘3",
    Icon: SquareHalfIcon,
  },
];

export function ViewSwitcher({ mode, onChange }: ViewSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          onChange("garden");
        } else if (e.key === "2") {
          e.preventDefault();
          onChange("split");
        } else if (e.key === "3") {
          e.preventDefault();
          onChange("slate");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [onChange]);

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

  const activeOption =
    VIEW_OPTIONS.find((option) => option.id === mode) ?? VIEW_OPTIONS[1];
  const ActiveIcon = activeOption.Icon;

  return (
    <div className={styles.viewSwitcherWrap} ref={containerRef}>
      <button
        type="button"
        className={`${styles.btnViewSwitcher} ${isOpen ? styles.btnViewSwitcherOpen : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        data-tooltip={isOpen ? undefined : `Layout: ${activeOption.label}`}
        aria-label={`Current layout: ${activeOption.label}. Click to switch view`}
        aria-expanded={isOpen}
      >
        <span className={styles.viewSwitcherIcon}>
          <ActiveIcon
            size={17}
            className={activeOption.rotated ? styles.rotatedIcon : undefined}
          />
        </span>
      </button>

      {isOpen && (
        <div className={styles.viewDropdownMenu} role="menu">
          {VIEW_OPTIONS.map(({ id, menuTitle, shortcut, Icon: OptionIcon, rotated }) => (
            <button
              key={id}
              type="button"
              className={`${styles.viewDropdownItem} ${mode === id ? styles.activeItem : ""}`}
              onClick={() => {
                onChange(id);
                setIsOpen(false);
              }}
              role="menuitem"
            >
              <span className={styles.itemIcon}>
                <OptionIcon
                  size={15}
                  className={rotated ? styles.rotatedIcon : undefined}
                />
              </span>
              <span className={styles.itemTitle}>{menuTitle}</span>
              <span className={styles.itemShortcut}>{shortcut}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
