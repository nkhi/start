import type { Vlog } from '../types';

interface VlogModalProps {
  vlog: Vlog;
  onClose: () => void;
}

export default function VlogModal({ vlog, onClose }: VlogModalProps) {
  return (
    <div className="vlog-modal-overlay" onClick={onClose}>
      click me
      <div className="vlog-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* <button className="vlog-modal-close" onClick={onClose}>
          ✕
        </button> */}
        <div dangerouslySetInnerHTML={{ __html: vlog.embedHtml }} />
      </div>
    </div>
  );
}
