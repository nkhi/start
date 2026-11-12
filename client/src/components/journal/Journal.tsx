import { JournalProvider } from "./JournalContext";
import { SplitLayout } from "./layouts/SplitLayout";
import { FloatingIsland } from "./components/FloatingIsland";
import { Garden } from "./views/Garden";
import { Slate } from "./views/Slate";
import { ReviewModal } from "./views/ReviewModal";
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
