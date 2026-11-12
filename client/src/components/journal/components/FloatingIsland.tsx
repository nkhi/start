import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CardsIcon,
  GraphIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useJournal } from "../JournalContext";
import { ViewSwitcher } from "./ViewSwitcher";
import styles from "./FloatingIsland.module.css";

export function FloatingIsland() {
  const {
    mode,
    setMode,
    gardenViewMode,
    toggleGardenView,
    isNewNodeOpen,
    openNewNode,
    searchQuery,
    setSearchQuery,
    slateViewMode,
    isViewingArchived,
    nextTopic,
    toggleLibrary,
    startNewReflection,
    backToLibrary,
  } = useJournal();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isSearchExpanded = isSearchOpen || searchQuery.length > 0;

  // Collapse empty search bar on outside click
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleOutsideMouseDown = (e: MouseEvent) => {
      if (
        searchShellRef.current &&
        !searchShellRef.current.contains(e.target as Node) &&
        searchQuery.length === 0
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
  }, [isSearchOpen, searchQuery.length]);

  const handleSearchTriggerClick = () => {
    if (isSearchExpanded && searchQuery.length === 0) {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }

    setIsSearchOpen(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      if (searchQuery.length > 0) {
        searchInputRef.current?.select();
      }
    });
  };

  const handleSearchClearOrClose = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  return (
    <div className={styles.floatingDockWrap}>
      <nav className={styles.floatingIsland} aria-label="Journal controls">
        {/* Garden Controls */}
        {mode !== "slate" && (
          <>
            <button
              type="button"
              className={styles.islandBtn}
              onClick={toggleGardenView}
              data-tooltip={gardenViewMode === "map" ? "List view" : "Map view"}
              aria-label={
                gardenViewMode === "map"
                  ? "Switch to List View"
                  : "Switch to Map View"
              }
            >
              {gardenViewMode === "map" ? (
                <ListBulletsIcon size={17} />
              ) : (
                <GraphIcon size={17} />
              )}
            </button>

            <button
              type="button"
              className={`${styles.islandBtn} ${isNewNodeOpen ? styles.islandBtnActive : ""}`}
              onClick={openNewNode}
              data-tooltip="Add thought"
              aria-label="Add thoughts or outline to your garden"
            >
              <PlusIcon size={17} />
            </button>

            <span className={styles.islandDivider} aria-hidden="true" />
          </>
        )}

        {/* Layout Switcher & Expandable Search */}
        <ViewSwitcher mode={mode} onChange={setMode} />

        <div
          ref={searchShellRef}
          className={`${styles.searchShell} ${isSearchExpanded ? styles.searchShellExpanded : ""}`}
        >
          <button
            type="button"
            className={`${styles.islandBtn} ${styles.searchTriggerBtn} ${
              searchQuery.trim().length > 0 ? styles.searchHasQuery : ""
            }`}
            onClick={handleSearchTriggerClick}
            aria-label={
              isSearchExpanded
                ? "Focus search"
                : "Search thoughts, tags, or documents"
            }
            aria-expanded={isSearchExpanded}
            data-tooltip={isSearchExpanded ? undefined : "Search"}
          >
            <MagnifyingGlassIcon size={17} />
          </button>

          <div className={styles.searchInputRegion}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search thoughts, tags, docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleSearchClearOrClose();
                }
              }}
              tabIndex={isSearchExpanded ? 0 : -1}
              aria-label="Search thoughts, tags, or documents"
            />
            <button
              type="button"
              className={styles.searchCloseBtn}
              onClick={handleSearchClearOrClose}
              tabIndex={isSearchExpanded ? 0 : -1}
              aria-label={
                searchQuery.length > 0 ? "Clear search" : "Close search"
              }
            >
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        </div>

        {/* Slate Controls */}
        {mode !== "garden" && (
          <>
            <span className={styles.islandDivider} aria-hidden="true" />

            {slateViewMode === "library" ? (
              <button
                type="button"
                className={styles.islandBtn}
                onClick={startNewReflection}
                data-tooltip="Write reflection"
                aria-label="Start a new reflection on today's sounding board"
              >
                <PencilSimpleIcon size={17} />
              </button>
            ) : isViewingArchived ? (
              <>
                <button
                  type="button"
                  className={styles.islandBtn}
                  onClick={backToLibrary}
                  data-tooltip="Back to library"
                  aria-label="Return to documents library"
                >
                  <ArrowLeftIcon size={17} />
                </button>
                <button
                  type="button"
                  className={styles.islandBtn}
                  onClick={startNewReflection}
                  data-tooltip="New reflection"
                  aria-label="Start a new reflection from today's suggestions"
                >
                  <NotePencilIcon size={17} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.islandBtn}
                onClick={() => void nextTopic()}
                data-tooltip="Next topic"
                aria-label="Cycle to next suggested question"
              >
                <ArrowsClockwiseIcon size={17} />
              </button>
            )}

            <button
              type="button"
              className={`${styles.islandBtn} ${slateViewMode === "library" ? styles.islandBtnActive : ""}`}
              onClick={toggleLibrary}
              data-tooltip={
                slateViewMode === "library" ? "Back to editor" : "Document library"
              }
              aria-label={
                slateViewMode === "library"
                  ? "Switch back to Editor"
                  : "Open Document Library"
              }
              aria-pressed={slateViewMode === "library"}
            >
              <CardsIcon size={18} />
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
