import { Injectable, inject } from '@angular/core';
import { ProgressStore } from '../../state/progress.store';

export type SoundName =
  | 'select'
  | 'place'
  | 'solve'
  | 'wrong'
  | 'hint'
  | 'coin'
  | 'win'
  | 'toggle';

interface Note {
  /** Semitone-free: plain frequencies, so the whole kit is readable at a glance. */
  readonly hz: number;
  /** Seconds from the start of the sound. */
  readonly at: number;
  readonly seconds: number;
  readonly shape: OscillatorType;
  readonly level: number;
  /** Slide to this frequency over the note's length. */
  readonly slideTo?: number;
}

/**
 * The kit, as pitches. Everything sits on a C major pentatonic, so two sounds
 * landing at once never clash - which happens constantly when a placement also
 * completes an equation.
 */
const KIT: Readonly<Record<SoundName, readonly Note[]>> = {
  // A soft tick when a cell is chosen.
  select: [{ hz: 440, at: 0, seconds: 0.05, shape: 'sine', level: 0.25 }],

  // A tile lands: short, bright, rising.
  place: [{ hz: 659, at: 0, seconds: 0.1, shape: 'triangle', level: 0.5, slideTo: 880 }],

  // An equation completes: three notes up.
  solve: [
    { hz: 523, at: 0, seconds: 0.09, shape: 'triangle', level: 0.45 },
    { hz: 659, at: 0.06, seconds: 0.09, shape: 'triangle', level: 0.45 },
    { hz: 784, at: 0.12, seconds: 0.16, shape: 'triangle', level: 0.45 },
  ],

  // Wrong: a low, short buzz. Deliberately not harsh - it happens a lot.
  wrong: [{ hz: 190, at: 0, seconds: 0.18, shape: 'square', level: 0.22, slideTo: 120 }],

  // A hint is spent: a small sparkle.
  hint: [
    { hz: 1046, at: 0, seconds: 0.07, shape: 'sine', level: 0.3 },
    { hz: 1568, at: 0.05, seconds: 0.12, shape: 'sine', level: 0.25 },
  ],

  // Coins in.
  coin: [
    { hz: 988, at: 0, seconds: 0.06, shape: 'triangle', level: 0.4 },
    { hz: 1318, at: 0.05, seconds: 0.14, shape: 'triangle', level: 0.4 },
  ],

  // Level complete.
  win: [
    { hz: 523, at: 0, seconds: 0.11, shape: 'triangle', level: 0.5 },
    { hz: 659, at: 0.1, seconds: 0.11, shape: 'triangle', level: 0.5 },
    { hz: 784, at: 0.2, seconds: 0.11, shape: 'triangle', level: 0.5 },
    { hz: 1046, at: 0.3, seconds: 0.34, shape: 'triangle', level: 0.55 },
    { hz: 1318, at: 0.32, seconds: 0.32, shape: 'sine', level: 0.28 },
  ],

  // Flicking sound back on.
  toggle: [{ hz: 784, at: 0, seconds: 0.08, shape: 'triangle', level: 0.4 }],
};

/** Keeps the whole kit well below clipping, and out of the way. */
const MASTER_LEVEL = 0.14;

/**
 * Sound, synthesised with the Web Audio API.
 *
 * No audio files: the whole kit is a few oscillators and envelopes, which keeps
 * the bundle exactly as small as it was, works offline with nothing to
 * download, and means the sounds can be tuned by editing numbers.
 *
 * Browsers refuse to start audio outside a user gesture, so the context is
 * created lazily on the first sound - which is always a tap, a click or a
 * keypress.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly progress = inject(ProgressStore);
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private unavailable = false;

  play(name: SoundName): void {
    if (!this.progress.sound()) return;

    const context = this.ensureContext();
    if (context === null || this.master === null) return;
    if (context.state === 'suspended') void context.resume();

    const startedAt = context.currentTime + 0.001;
    for (const note of KIT[name]) this.schedule(context, this.master, note, startedAt);
  }

  private schedule(context: AudioContext, master: GainNode, note: Note, startedAt: number): void {
    const at = startedAt + note.at;
    const until = at + note.seconds;

    const oscillator = context.createOscillator();
    oscillator.type = note.shape;
    oscillator.frequency.setValueAtTime(note.hz, at);
    if (note.slideTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(note.slideTo, until);
    }

    // A quick attack and an exponential tail: percussive, and it never clicks.
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(note.level, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, until);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(at);
    oscillator.stop(until + 0.02);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
  }

  private ensureContext(): AudioContext | null {
    if (this.context !== null) return this.context;
    if (this.unavailable) return null;

    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      return context;
    } catch {
      // No Web Audio: the game is simply silent.
      this.unavailable = true;
      return null;
    }
  }
}
