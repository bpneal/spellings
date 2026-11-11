import { BackButton, Mascot, SpeakButton, SpeechStuckBanner, TopBar } from '../components/common';
import { useSpeech, useStopSpeechOnExit } from '../hooks/useSpeech';
import type { Child } from '../lib/types';

/** See (and hear) all the words before playing. */
export function Learn({
  child,
  onBack,
  onStart,
}: {
  child: Child;
  onBack: () => void;
  onStart: () => void;
}) {
  const { spell, supported } = useSpeech();
  useStopSpeechOnExit();
  return (
    <div className="screen">
      <TopBar left={<BackButton onClick={onBack} />} title="📖 My spellings" />
      <main className="learn">
        <SpeechStuckBanner />
        <Mascot
          theme={child.theme}
          size="sm"
          message={
            supported
              ? 'Tap a word to hear it spelled out. Look at the letters carefully!'
              : 'Look carefully at each word. Can you say the letters out loud?'
          }
        />
        <ul className="learn-grid">
          {child.words.map((word) => (
            <li key={word}>
              <button
                type="button"
                className="learn-card"
                onClick={() => spell(word)}
                aria-label={`${word}, tap to hear it spelled`}
              >
                <span className="learn-card__word">{word}</span>
                <span className="learn-card__letters" aria-hidden="true">
                  {[...word].map((ch, i) => (
                    <span key={i}>{ch}</span>
                  ))}
                </span>
              </button>
              <SpeakButton text={word} />
            </li>
          ))}
        </ul>
        <div className="row row--center">
          <button type="button" className="btn btn--primary btn--big" onClick={onStart}>
            I'm ready to play! 🎮
          </button>
        </div>
      </main>
    </div>
  );
}
