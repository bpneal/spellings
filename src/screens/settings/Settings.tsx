import { useState } from 'react';
import { BackButton, TopBar } from '../../components/common';
import { useAppData } from '../../state/useAppData';
import { BackupSettings } from './BackupSettings';
import { ChildrenSettings } from './ChildrenSettings';
import { ProgressReport } from './ProgressReport';
import { SpeechSettings } from './SpeechSettings';

type Tab = 'children' | 'progress' | 'speech' | 'backup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'children', label: '👧👦 Children & spellings' },
  { id: 'progress', label: '📊 Progress' },
  { id: 'speech', label: '🔊 Voice & sound' },
  { id: 'backup', label: '💾 Backup' },
];

export function Settings({
  onBack,
  initialChildId,
}: {
  onBack: () => void;
  initialChildId?: string;
}) {
  const { saveOk } = useAppData();
  const [tab, setTab] = useState<Tab>('children');

  return (
    <div className="screen screen--settings">
      <TopBar left={<BackButton onClick={onBack} label="Done" />} title="Settings for grown-ups" />
      <main className="settings">
        {!saveOk && (
          <div className="alert alert--error" role="alert">
            Changes couldn't be saved to this browser (storage may be full or disabled). Use Backup
            to keep a copy.
          </div>
        )}
        <div className="tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tabs__tab${tab === t.id ? ' is-on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <section className="panel" role="tabpanel">
          {tab === 'children' && <ChildrenSettings initialChildId={initialChildId} />}
          {tab === 'progress' && <ProgressReport initialChildId={initialChildId} />}
          {tab === 'speech' && <SpeechSettings />}
          {tab === 'backup' && <BackupSettings />}
        </section>
      </main>
    </div>
  );
}
