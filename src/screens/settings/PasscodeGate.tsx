import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BackButton, TopBar } from '../../components/common';
import {
  LOCKOUT_MS,
  lockoutSecondsLeft,
  recordFailedTry,
  resetPasscodeAttempts,
} from '../../lib/passcodeAttempts';

/** Asks for the 4-digit passcode before showing Settings. */
export function PasscodeGate({
  passcode,
  onUnlock,
  onCancel,
}: {
  passcode: string;
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [waitSeconds, setWaitSeconds] = useState(() => lockoutSecondsLeft());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  // Count down while locked out after too many wrong guesses.
  const locked = waitSeconds > 0;
  useEffect(() => {
    if (!locked) return;
    const timer = setInterval(() => {
      const left = lockoutSecondsLeft();
      setWaitSeconds(left);
      if (left === 0) input.current?.focus();
    }, 250);
    return () => clearInterval(timer);
  }, [locked]);

  const check = (code: string) => {
    if (locked || code.length !== 4) return;
    if (code === passcode) {
      resetPasscodeAttempts();
      onUnlock();
      return;
    }
    if (recordFailedTry()) {
      setWaitSeconds(Math.ceil(LOCKOUT_MS / 1000));
      setError('Too many wrong tries.');
    } else {
      setError("That passcode isn't right. Please try again.");
    }
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setValue(digits);
    setError(undefined);
    if (digits.length === 4) check(digits);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    check(value);
  };

  return (
    <div className="screen screen--settings">
      <TopBar left={<BackButton onClick={onCancel} />} title="Settings for grown-ups" />
      <main className="gate">
        <form className="panel gate__panel" onSubmit={onSubmit}>
          <span className="gate__icon" aria-hidden="true">
            🔒
          </span>
          <h2>Enter the passcode</h2>
          <label className="sr-only" htmlFor="passcode-entry">
            Passcode
          </label>
          <input
            ref={input}
            id="passcode-entry"
            className="input passcode-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={locked}
            aria-invalid={!!error}
            aria-describedby="passcode-message"
          />
          <p id="passcode-message" className="gate__message" role="status">
            {locked ? `${error ?? 'Too many wrong tries.'} Try again in ${waitSeconds}s.` : error}
          </p>
          <div className="row row--center">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={locked || value.length !== 4}
            >
              Unlock
            </button>
          </div>
          <details className="gate__help">
            <summary>Forgotten the passcode?</summary>
            <p>
              The passcode is stored in this browser with the rest of the app's data. Clearing this
              site's data in your browser settings removes the passcode, but it also deletes all
              children, spellings and progress, so restore a backup afterwards if you have one.
            </p>
          </details>
        </form>
      </main>
    </div>
  );
}
