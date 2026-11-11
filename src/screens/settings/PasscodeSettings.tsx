import { useState, type FormEvent } from 'react';
import { isValidPasscode } from '../../lib/storage';
import { useAppData } from '../../state/useAppData';
import { ConfirmButton } from './ConfirmButton';

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4);

/** Set, change or remove the passcode that locks Settings. */
export function PasscodeSettings() {
  const { data, dispatch } = useAppData();
  const hasPasscode = !!data.settings.passcode;
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const save = (e: FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    if (!isValidPasscode(first)) return setError('The passcode must be exactly 4 digits.');
    if (first !== second) return setError("The two passcodes don't match.");
    dispatch({ type: 'updateSettings', changes: { passcode: first } });
    setFirst('');
    setSecond('');
    setError(undefined);
    setMessage(hasPasscode ? 'Passcode changed.' : 'Passcode set. Settings are now locked.');
  };

  const remove = () => {
    dispatch({ type: 'updateSettings', changes: { passcode: undefined } });
    setFirst('');
    setSecond('');
    setError(undefined);
    setMessage('Passcode removed. Settings are no longer locked.');
  };

  return (
    <form className="form" onSubmit={save}>
      <h2>Passcode lock</h2>
      <p>
        {hasPasscode
          ? 'Settings are locked with a 4-digit passcode. You can change it or remove it here.'
          : 'Add a 4-digit passcode so only grown-ups can open Settings. Without one, anyone can open Settings.'}
      </p>

      <label className="field">
        <span className="field__label">{hasPasscode ? 'New passcode' : 'Passcode'}</span>
        <input
          className="input passcode-input passcode-input--small"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          value={first}
          onChange={(e) => {
            setFirst(digitsOnly(e.target.value));
            setError(undefined);
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Type it again</span>
        <input
          className="input passcode-input passcode-input--small"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          value={second}
          onChange={(e) => {
            setSecond(digitsOnly(e.target.value));
            setError(undefined);
          }}
        />
      </label>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={first.length !== 4 || second.length !== 4}
        >
          {hasPasscode ? 'Change passcode' : 'Set passcode'}
        </button>
        {hasPasscode && (
          <ConfirmButton
            label="Remove passcode"
            confirmLabel="Yes, remove the lock"
            onConfirm={remove}
          />
        )}
      </div>

      {message && (
        <p className="alert alert--ok" role="status">
          {message}
        </p>
      )}

      <p className="field__hint">
        This is a simple lock to keep children out of Settings, not strong security. The passcode is
        saved in this browser with the rest of the app's data and is included in backups.
      </p>
    </form>
  );
}
