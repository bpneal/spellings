import { useEffect, useRef } from 'react';
import { useSpeech, useSpeechStatus, useVoices } from '../../hooks/useSpeech';
import { resetSpeech, speak, spellOut, type SpeechLogEntry } from '../../lib/speech';
import { useAppData } from '../../state/useAppData';

export function SpeechSettings() {
  const { data, dispatch } = useAppData();
  const { say, sfx, supported } = useSpeech();
  const voices = useVoices();
  const { voiceURI, rate, soundEffects } = data.settings;

  // Speak a short sample after the voice or speed changes, so it's obvious whether the
  // chosen voice responds to the speed setting. Debounced so dragging the slider doesn't chatter.
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(previewTimer.current), []);
  const preview = (next: { voiceURI?: string; rate: number }) => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(
      () => speak(`This is how fast I talk. ${spellOut('cat', next.rate)}`, next),
      400,
    );
  };

  return (
    <div className="form">
      <h2>Voice</h2>
      {!supported ? (
        <p className="alert">
          This browser doesn't support speech. The Spelling Test level will show the word briefly
          instead of saying it.
        </p>
      ) : (
        <>
          <label className="field">
            <span className="field__label">Voice</span>
            <select
              className="input"
              value={voiceURI ?? ''}
              onChange={(e) => {
                const next = e.target.value || undefined;
                dispatch({ type: 'updateSettings', changes: { voiceURI: next } });
                preview({ voiceURI: next, rate });
              }}
            >
              <option value="">Automatic (British English if available)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.localService ? '' : ' (online)'}
                </option>
              ))}
            </select>
            <span className="field__hint">
              Voices come from your computer or tablet. On a Mac, more British voices can be added
              in System Settings → Accessibility → Spoken Content.
            </span>
          </label>

          <label className="field">
            <span className="field__label">Speaking speed: {rate.toFixed(2)}×</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={rate}
              onChange={(e) => {
                const next = Number(e.target.value);
                dispatch({ type: 'updateSettings', changes: { rate: next } });
                preview({ voiceURI, rate: next });
              }}
            />
            <span className="field__hint">
              A sample plays when you change the speed. Slower settings always leave longer gaps
              between spelled-out letters. Some voices ignore the speed of the words themselves.
              This is a browser limitation, common with the built-in Mac voices in Chrome. Chrome's
              “Google” voices respect the speed but are online, and can be less reliable.
            </span>
          </label>

          <div className="row">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => say('Well done! Can you spell, because?')}
            >
              ▶ Test voice
            </button>
          </div>

          <SpeechTroubleshooting />
        </>
      )}

      <h2>Sound effects</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={soundEffects}
          onChange={(e) =>
            dispatch({ type: 'updateSettings', changes: { soundEffects: e.target.checked } })
          }
        />
        <span>Play happy chimes for correct answers and finished rounds</span>
      </label>
      {soundEffects && (
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => sfx('correct')}>
            ▶ Try the chime
          </button>
        </div>
      )}
    </div>
  );
}

const BAD_EVENTS = new Set<SpeechLogEntry['event']>(['error', 'timeout', 'failed', 'stuck']);

function SpeechTroubleshooting() {
  const { health, log } = useSpeechStatus();
  return (
    <details className="field">
      <summary className="field__label">Troubleshooting: talking stops working</summary>
      <p>
        Some browsers (especially Chrome on a Mac) occasionally stop speaking until the page is
        reloaded. The app retries automatically and, if the talking keeps failing, shows children a
        big “Tap here to fix it” button that reloads the page.
      </p>
      <p>
        Status:{' '}
        <strong>{health === 'ok' ? '✔ Working' : '✖ Stuck. Reload the page to fix it.'}</strong>
      </p>
      <div className="row">
        <button type="button" className="btn btn--ghost" onClick={resetSpeech}>
          Reset speech
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
      {log.length > 0 && (
        <>
          <span className="field__hint">
            Recent speech activity (newest last). If problems continue, this shows what the browser
            reported.
          </span>
          <ol className="speech-log">
            {log.map((e, i) => (
              <li key={i} className={BAD_EVENTS.has(e.event) ? 'speech-log__bad' : undefined}>
                {new Date(e.at).toLocaleTimeString('en-GB')} {e.event}
                {e.text && ` "${e.text}"`}
                {e.detail && ` (${e.detail})`}
              </li>
            ))}
          </ol>
        </>
      )}
    </details>
  );
}
