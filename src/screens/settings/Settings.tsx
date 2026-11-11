import { useState } from 'react';
import { BackButton, TopBar } from '../../components/common';
import { useAppData } from '../../state/useAppData';
import { BackupSettings } from './BackupSettings';
import { ChildrenSettings } from './ChildrenSettings';
import { PasscodeGate } from './PasscodeGate';
import { PasscodeSettings } from './PasscodeSettings';
import { ProgressReport } from './ProgressReport';
import { SpeechSettings } from './SpeechSettings';

type Tab = 'children' | 'progress' | 'speech' | 'passcode' | 'backup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'children', label: '👧👦 Children & spellings' },
  { id: 'progress', label: '📊 Progress' },
  { id: 'speech', label: '🔊 Voice & sound' },
  { id: 'passcode', label: '🔒 Passcode' },
  { id: 'backup', label: '💾 Backup' },
];

export function Settings({
  onBack,
  initialChildId,
}: {
  onBack: () => void;
  initialChildId?: string;
}) {
  const { data, saveOk } = useAppData();
  const [tab, setTab] = useState<Tab>('children');
  // Settings is mounted fresh on each visit, so it locks again whenever you leave.
  // Setting a passcode while inside doesn't lock you out of the current visit.
  const [unlocked, setUnlocked] = useState(() => !data.settings.passcode);

  if (!unlocked && data.settings.passcode) {
    return (
      <PasscodeGate
        passcode={data.settings.passcode}
        onUnlock={() => setUnlocked(true)}
        onCancel={onBack}
      />
    );
  }

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
          {tab === 'passcode' && <PasscodeSettings />}
          {tab === 'backup' && <BackupSettings />}
        </section>
      </main>
    </div>
  );
}
