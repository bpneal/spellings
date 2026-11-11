/** Tiny synthesised sound effects (no audio files needed, works offline). Only happy sounds. */

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, volume = 0.15) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A bright rising chime for a correct word. */
export function playCorrect(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, t + i * 0.09, 0.35));
}

/** A soft, friendly "boop" for "have another go" — deliberately not a buzzer. */
export function playTryAgain(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 440, t, 0.18, 0.08);
  tone(ac, 523.25, t + 0.12, 0.25, 0.08);
}

/** A little fanfare for finishing a round. */
export function playFanfare(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
    tone(ac, f, t + i * 0.12, i === 5 ? 0.6 : 0.25, 0.12),
  );
}

/** A tile "pop" when tapping letters. */
export function playTap(): void {
  const ac = audio();
  if (!ac) return;
  tone(ac, 880, ac.currentTime, 0.08, 0.05);
}
