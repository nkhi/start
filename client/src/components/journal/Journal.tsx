import { JournalProvider } from "./JournalContext";
import { SplitLayout } from "./components/SplitLayout";
import { FloatingIsland } from "./components/FloatingIsland";
import { ReviewModal } from "./components/ReviewModal";
import { Garden } from "./views/Garden";
import { Slate } from "./views/Slate";
import styles from "./Journal.module.css";

export function Journal() {
  return (
    <JournalProvider>
      <div className={styles.journalRoot}>
        <SplitLayout left={<Garden />} right={<Slate />} />
        <FloatingIsland />
        <ReviewModal />
      </div>
    </JournalProvider>
  );
}
