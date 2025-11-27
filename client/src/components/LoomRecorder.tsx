import { useEffect, useRef, useState } from 'react';
import { setup } from '@loomhq/record-sdk';
import { isSupported } from '@loomhq/record-sdk/is-supported';
import { oembed } from '@loomhq/loom-embed';

const PUBLIC_APP_ID = 'fae3c61b-58d9-47dc-9cc8-c148e8d8dbaf';

interface LoomRecorderProps {
  weekStart: Date;
  onSave: (weekStart: Date, videoUrl: string, embedHtml: string) => void;
  onCancel: () => void;
}

export function LoomRecorder({ weekStart, onSave, onCancel }: LoomRecorderProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setupLoom();
  }, []);

  async function setupLoom() {
    try {
      setIsChecking(true);
      
      // Check browser support first
      const { supported, error: supportError } = await isSupported();

      if (!supported) {
        setError(`Loom is not supported in your browser: ${supportError || 'Unknown error'}`);
        setIsChecking(false);
        return;
      }

      if (!buttonRef.current) {
        setError('Button element not found');
        setIsChecking(false);
        return;
      }

      // Setup Loom SDK
      const { configureButton } = await setup({
        publicAppId: PUBLIC_APP_ID,
      });

      const sdkButton = configureButton({ element: buttonRef.current });

      sdkButton.on('insert-click', async (video) => {
        try {
          const { html } = await oembed(video.sharedUrl, { width: 600 });
          onSave(weekStart, video.sharedUrl, html);
        } catch (err) {
          console.error('Failed to get video embed:', err);
          setError('Failed to process video. Please try again.');
        }
      });

      sdkButton.on('cancel', () => {
        onCancel();
      });

      setIsReady(true);
      setIsChecking(false);
    } catch (err) {
      console.error('Failed to setup Loom:', err);
      setError(`Failed to initialize Loom recorder: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsChecking(false);
    }
  }

  return (
    <div className="loom-recorder-modal">
      <div className="loom-recorder-content">
        <h2>Record Weekly Vlog</h2>
        <p>Record your thoughts and progress for the week</p>
        
        {error && (
          <div className="error-message">
            {error}
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              Make sure third-party cookies are enabled and you're using a supported browser (Chrome, Edge, or Brave).
            </p>
          </div>
        )}

        <div className="loom-recorder-actions">
          <button
            ref={buttonRef}
            className="loom-record-button"
            disabled={!isReady || isChecking}
          >
            {isChecking ? 'Checking compatibility...' : isReady ? 'Start Recording' : 'Not Available'}
          </button>
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
