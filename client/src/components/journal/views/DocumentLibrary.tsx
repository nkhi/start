import type { EntrySummary } from "../../../types";
import styles from "./DocumentLibrary.module.css";

interface DocumentLibraryProps {
  summaries: EntrySummary[];
  searchQuery?: string;
  onSelectEntry: (summary: EntrySummary) => void;
  onNewReflection: () => void;
}

function formatTimestamp(unixSecs: number): string {
  if (!unixSecs) return "";
  const d = new Date(unixSecs * 1000);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return (
      "Today, " +
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    );
  } else if (diffDays === 1) {
    return (
      "Yesterday, " +
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    );
  } else if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } else {
    return d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

export function DocumentLibrary({
  summaries,
  searchQuery = "",
  onSelectEntry,
  onNewReflection,
}: DocumentLibraryProps) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = (summaries || []).filter((item) => {
    if (!item?.entry) return false;
    if (!query) return true;
    const textMatch = item.entry.plain_text?.toLowerCase().includes(query) ?? false;
    const titleMatch = item.primary_node?.node?.title?.toLowerCase().includes(query) ?? false;
    const tagMatch = item.primary_node?.tags?.some((t) =>
      t.toLowerCase().includes(query),
    ) ?? false;
    return textMatch || titleMatch || tagMatch;
  });

  return (
    <div className={styles.documentLibraryRoot}>
      {/* Main Grid of Sheets of Paper */}
      <div className={styles.libraryGridContainer}>
        {filtered.length === 0 ? (
          <div className={styles.libraryEmptyState}>
            <div className={styles.emptyPaperIcon}>📄</div>
            <h3>
              {query
                ? `No reflections matching "${searchQuery}"`
                : "Your reflection library is empty"}
            </h3>
            <p>
              {query
                ? "Try searching for a different keyword or topic."
                : "When you reflect on the Slate and complete a session, each entry is preserved here as a permanent document linked back to your garden."}
            </p>
            {!query && (
              <button
                className={styles.libraryCtaBtn}
                onClick={onNewReflection}
              >
                + Write Your First Reflection
              </button>
            )}
          </div>
        ) : (
          <div className={styles.libraryPaperGrid}>
            {filtered.map((item) => {
              const primaryTitle =
                item.primary_node?.node.title || "Reflective Journal";
              const plainSnippet = (item.entry.plain_text || "").trim();
              const dateStr = formatTimestamp(item.entry.updated_at);

              return (
                <div
                  key={item.entry.id}
                  className={styles.paperSheet}
                  onClick={() => onSelectEntry(item)}
                  title={`Open reflection from ${dateStr}`}
                >
                  {/* Top Paper Header: Date & Word Count */}
                  <div className={styles.paperSheetHeader}>
                    <span className={styles.paperDate}>{dateStr}</span>
                    <span className={styles.paperWordCount}>
                      {item.entry.word_count || 0} words
                    </span>
                  </div>

                  {/* Primary Topic Prompt & Tags */}
                  <div className={styles.paperSheetTitle}>{primaryTitle}</div>

                  {item.primary_node?.tags &&
                    item.primary_node.tags.length > 0 && (
                      <div className={styles.paperSheetTags}>
                        {item.primary_node.tags.slice(0, 3).map((t) => (
                          <span key={t} className={styles.cardTag}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Divider line imitating fine stationery */}
                  <div className={styles.paperSheetDivider} />

                  {/* Text Preview Snippet */}
                  <div className={styles.paperSheetPreview}>
                    {plainSnippet || (
                      <span className={styles.paperPreviewEmpty}>
                        (Draft with no text yet)
                      </span>
                    )}
                  </div>

                  {/* Bottom Paper Footer: Backlinks to Garden */}
                  <div className={styles.paperSheetFooter}>
                    <div className={styles.paperBacklink} title="Originating Garden Topic">
                      <span className={styles.paperLinkIcon}>🔗</span>
                      <span className={styles.paperLinkTitle}>
                        {item.primary_node?.node.title || "Independent"}
                      </span>
                    </div>
                    <span className={styles.paperReadCue}>Open →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

