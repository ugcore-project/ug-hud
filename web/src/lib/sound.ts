/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Short synthesized sounds, so the page ships no audio files. Silent where Web Audio is missing, such as tests.

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") {
    return null;
  }

  context ??= new window.AudioContext();

  return context;
}

function tone(frequency: number, start: number, duration: number, volume: number): void {
  const ctx = audio();

  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const at = ctx.currentTime + start;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

export const Sounds = {
  /** Two rising notes. */
  buckle: () => {
    tone(660, 0, 0.09, 0.12);
    tone(990, 0.08, 0.12, 0.12);
  },
  /** Two falling notes. */
  unbuckle: () => {
    tone(880, 0, 0.09, 0.1);
    tone(520, 0.08, 0.14, 0.1);
  },
  /** The classic unbuckled chime. */
  warning: () => {
    tone(1250, 0, 0.18, 0.08);
  },
  cruise: () => tone(740, 0, 0.08, 0.08),
  heartbeat: () => {
    tone(60, 0, 0.12, 0.25);
    tone(55, 0.16, 0.14, 0.2);
  },
};
