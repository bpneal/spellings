import { useState, type FormEvent } from 'react';
import { newId } from '../../lib/storage';
import { THEMES } from '../../lib/themes';
import type { Child, Theme } from '../../lib/types';
import { parseWordList } from '../../lib/words';
import { useAppData } from '../../state/useAppData';
import { ConfirmButton } from './ConfirmButton';

export function ChildrenSettings({ initialChildId }: { initialChildId?: string }) {
  const { data } = useAppData();
  const [selectedId, setSelectedId] = useState<string | 'new'>(
    () => initialChildId ?? data.children[0]?.id ?? 'new',
  );
  const selected = data.children.find((c) => c.id === selectedId);
  const editing = selectedId === 'new' || !selected ? 'new' : selected;

  return (
    <div className="children-settings">
      <div className="chip-row" role="tablist" aria-label="Children">
        {data.children.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === selectedId}
            className={`chip${c.id === selectedId ? ' is-on' : ''}`}
            onClick={() => setSelectedId(c.id)}
          >
            {THEMES[c.theme].mascot} {c.name}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={editing === 'new'}
          className={`chip chip--add${editing === 'new' ? ' is-on' : ''}`}
          onClick={() => setSelectedId('new')}
        >
          + Add child
        </button>
      </div>

      <ChildEditor
        key={editing === 'new' ? 'new' : editing.id}
        child={editing === 'new' ? undefined : editing}
        onSaved={setSelectedId}
        onRemoved={() => setSelectedId(data.children.find((c) => c.id !== selectedId)?.id ?? 'new')}
      />
    </div>
  );
}

function ChildEditor({
  child,
  onSaved,
  onRemoved,
}: {
  child?: Child;
  onSaved: (id: string) => void;
  onRemoved: () => void;
}) {
  const { dispatch } = useAppData();
  const [name, setName] = useState(child?.name ?? '');
  const [theme, setTheme] = useState<Theme>(child?.theme ?? 'boy');
  const [wordsText, setWordsText] = useState(child?.words.join('\n') ?? '');
  const [saved, setSaved] = useState(false);

  const words = parseWordList(wordsText);
  const dirty =
    !child ||
    name.trim() !== child.name ||
    theme !== child.theme ||
    words.join('\n') !== child.words.join('\n');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (child) {
      dispatch({ type: 'updateChild', id: child.id, changes: { name, theme, words } });
      onSaved(child.id);
    } else {
      const id = newId();
      dispatch({ type: 'addChild', id, name, theme, words });
      onSaved(id);
    }
    setWordsText(words.join('\n'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="form" onSubmit={save}>
      <h2>{child ? `Edit ${child.name}` : 'Add a child'}</h2>

      <label className="field">
        <span className="field__label">Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam"
          maxLength={30}
          required
        />
      </label>

      <fieldset className="field">
        <legend className="field__label">Theme</legend>
        <div className="theme-options">
          {(['boy', 'girl'] as const).map((t) => (
            <label
              key={t}
              className={`theme-option theme-option--${t}${theme === t ? ' is-on' : ''}`}
            >
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={() => setTheme(t)}
                className="sr-only"
              />
              <span className="theme-option__mascot" aria-hidden="true">
                {THEMES[t].mascot}
              </span>
              <span>{THEMES[t].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">
          Spelling list{' '}
          <span className="muted">
            ({words.length} word{words.length === 1 ? '' : 's'})
          </span>
        </span>
        <textarea
          className="input textarea"
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          rows={10}
          placeholder={'One word per line (or separated by commas)\ne.g.\nrain\ntrain\nwait\nsnail'}
          spellCheck={false}
        />
        <span className="field__hint">
          Type the words exactly as they should be spelled. Duplicates and blank lines are removed
          when you save. Capital letters don't matter when your child answers.
        </span>
      </label>

      {words.length > 0 && (
        <div className="word-preview" aria-label="Preview">
          {words.map((w) => (
            <span key={w} className="chip chip--static">
              {w}
            </span>
          ))}
        </div>
      )}

      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!name.trim() || !dirty}>
          {child ? 'Save changes' : 'Add child'}
        </button>
        {saved && (
          <span className="saved" role="status">
            ✔ Saved
          </span>
        )}
      </div>

      {child && (
        <div className="danger-zone">
          <h3>Other options</h3>
          <div className="row">
            <ConfirmButton
              label="Reset progress"
              confirmLabel={`Yes, reset ${child.name}'s stars, streaks and trophies`}
              onConfirm={() => dispatch({ type: 'resetProgress', childId: child.id })}
            />
            <ConfirmButton
              label={`Remove ${child.name}`}
              confirmLabel={`Yes, remove ${child.name} and all their progress`}
              onConfirm={() => {
                dispatch({ type: 'removeChild', id: child.id });
                onRemoved();
              }}
            />
          </div>
        </div>
      )}
    </form>
  );
}
