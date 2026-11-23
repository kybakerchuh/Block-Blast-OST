class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPickup() {
    this.playTone(440, 0.06, 'triangle', 0.08, 0, 560);
  }

  playPlace() {
    this.playTone(190, 0.09, 'sine', 0.14, 0, 120);
    this.playTone(320, 0.05, 'triangle', 0.06, 0.01, 240);
  }

  playClear(combo = 1) {
    const base = 440 * Math.pow(1.06, Math.min(combo - 1, 8));
    this.playTone(base, 0.16, 'triangle', 0.12, 0);
    this.playTone(base * 1.25, 0.18, 'triangle', 0.12, 0.05);
    this.playTone(base * 1.5, 0.24, 'sine', 0.14, 0.1);
  }

  playBoardClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.26, 'triangle', 0.14, idx * 0.06);
    });
  }

  playOstCorrect() {
    this.playTone(587.33, 0.12, 'triangle', 0.13, 0);
    this.playTone(880, 0.22, 'sine', 0.15, 0.09);
  }

  playOstWrong() {
    this.playTone(220, 0.15, 'sawtooth', 0.07, 0, 175);
    this.playTone(165, 0.22, 'sawtooth', 0.07, 0.11, 130);
  }

  playGameOver() {
    this.playTone(392, 0.18, 'triangle', 0.1, 0, 349);
    this.playTone(329, 0.2, 'triangle', 0.1, 0.14, 293);
    this.playTone(261, 0.3, 'sine', 0.11, 0.28, 220);
  }

  playLevelWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, 'triangle', 0.13, idx * 0.07);
    });
  }
}

export const soundEngine = new SoundEngine();
