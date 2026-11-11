import { useRef, useState } from 'react';
import { dayKey } from '../../lib/progress';
import { parseAppData } from '../../lib/storage';
import type { AppData } from '../../lib/types';
import { useAppData } from '../../state/useAppData';
import { ConfirmButton } from './ConfirmButton';

export function BackupSettings() {
  const { data, dispatch } = useAppData();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData>();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string }>();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spelling-stars-backup-${dayKey()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: 'ok', text: 'Backup downloaded.' });
  };

  const onFile = async (file: File | undefined) => {
    setPending(undefined);
    setMessage(undefined);
    if (!file) return;
    try {
      setPending(parseAppData(JSON.parse(await file.text())));
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof SyntaxError ? 'That file is not valid JSON.' : (err as Error).message,
      });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="form">
      <h2>Back up</h2>
      <p>
        Everything is saved in this browser only. Clearing your browsing data will delete it, so
        download a backup now and then (and before changing computer or browser).
      </p>
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={exportData}>
          ⬇ Download backup
        </button>
      </div>

      <h2>Restore</h2>
      <p>
        Restoring a backup <strong>replaces</strong> all children, spellings, progress and settings
        on this device, including the passcode (or lack of one) saved in the backup.
      </p>
      <label className="btn btn--secondary file-btn">
        ⬆ Choose backup file…
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>

      {pending && (
        <div className="alert">
          <p>
            This backup has <strong>{pending.children.length}</strong> child
            {pending.children.length === 1 ? '' : 'ren'}:{' '}
            {pending.children.map((c) => c.name).join(', ') || 'none'}.
          </p>
          <div className="row">
            <ConfirmButton
              label="Restore this backup"
              confirmLabel="Yes, replace everything"
              onConfirm={() => {
                dispatch({ type: 'replaceAll', data: pending });
                setPending(undefined);
                setMessage({ kind: 'ok', text: 'Backup restored.' });
              }}
            />
            <button type="button" className="btn btn--ghost" onClick={() => setPending(undefined)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`alert ${message.kind === 'error' ? 'alert--error' : 'alert--ok'}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
