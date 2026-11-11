import type { Rng } from './words';

export const CORRECT_FIRST = [
  'Brilliant!',
  'Amazing spelling!',
  'Super speller!',
  'You got it!',
  'Fantastic!',
  'Wow, perfect!',
  'Superstar!',
  'Spot on!',
  'Awesome!',
  'Top marks!',
];

export const CORRECT_SECOND = [
  'You did it!',
  'Great job for trying again!',
  'Yes! Well done!',
  'You worked it out!',
  'Brilliant second try!',
];

export const TRY_AGAIN = [
  'Nearly! Have another go.',
  'So close! Try again.',
  'Good try! Look at the green letters.',
  'Almost there! You can do it.',
];

export const REVEAL = [
  "This one's tricky! Let's look at it together.",
  "That's a hard one! Here's how to spell it.",
  "Let's learn this one. We'll try it again soon!",
];

export function pick(list: readonly string[], rng: Rng = Math.random): string {
  return list[Math.floor(rng() * list.length)] ?? list[0] ?? '';
}

export function roundMessage(percent: number): string {
  if (percent === 100) return 'Every word right first time! You are a spelling superstar!';
  if (percent >= 80) return 'Wow! Brilliant spelling!';
  if (percent >= 50) return "Great work! You're getting better and better!";
  return 'Well done for practising! Every try makes your brain stronger!';
}
