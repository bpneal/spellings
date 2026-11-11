import { useSpeech, useVoices } from '../../hooks/useSpeech';
import { useAppData } from '../../state/useAppData';

export function SpeechSettings() {
  const { data, dispatch } = useAppData();
  const { say, sfx, supported } = useSpeech();
  const voices = useVoices();
  const { voiceURI, rate, soundEffects } = data.settings;

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
              onChange={(e) =>
                dispatch({
                  type: 'updateSettings',
                  changes: { voiceURI: e.target.value || undefined },
                })
              }
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
              onChange={(e) =>
                dispatch({ type: 'updateSettings', changes: { rate: Number(e.target.value) } })
              }
            />
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
