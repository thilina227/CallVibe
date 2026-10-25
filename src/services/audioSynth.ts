/**
 * Web Audio API synthesizer for phone dialing, ringback tones,
 * and acoustic vibration motor leak simulation.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringOsc1: OscillatorNode | null = null;
  private ringOsc2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringInterval: number | null = null;
  private isRingingActive: boolean = false;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play DTMF keypad tone for telephone dialer buttons
   */
  playDtmf(key: string) {
    try {
      const ctx = this.initContext();
      const dtmfFrequencies: Record<string, [number, number]> = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      };

      const freqs = dtmfFrequencies[key] || [700, 1200];
      const now = ctx.currentTime;
      const duration = 0.12;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Audio autoplay may be constrained before first user interaction
    }
  }

  /**
   * Start authentic telephone ringback tone (440Hz + 480Hz dual tone cadence: 2s sound, 3s pause)
   */
  startRingbackTone() {
    this.stopRingbackTone();
    try {
      const ctx = this.initContext();
      this.isRingingActive = true;

      const playBurst = () => {
        if (!this.isRingingActive || !this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const burstDuration = 1.6;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.setValueAtTime(440, now); // Standard North American / Global ringback tone
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.05);
        gain.gain.setValueAtTime(0.07, now + burstDuration - 0.05);
        gain.gain.linearRampToValueAtTime(0, now + burstDuration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + burstDuration);
        osc2.stop(now + burstDuration);
      };

      // Play first ring immediately
      playBurst();
      // Cadence loop: every 3.5 seconds
      this.ringInterval = window.setInterval(() => {
        if (this.isRingingActive) {
          playBurst();
        }
      }, 3500);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Stop ringback tone instantly when connected or hung up
   */
  stopRingbackTone() {
    this.isRingingActive = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOsc1) {
      try { this.ringOsc1.stop(); } catch {}
      this.ringOsc1 = null;
    }
    if (this.ringOsc2) {
      try { this.ringOsc2.stop(); } catch {}
      this.ringOsc2 = null;
    }
  }

  /**
   * Simulate what the RECEIVER hears.
   * If muteMicrophone is false:
   *   The vibration motor mechanical buzzing (150Hz-220Hz rattling hum) leaks into the call microphone
   *   and produces an annoying buzz in the receiver's ear!
   * If muteMicrophone is true:
   *   The mic is muted during the 250ms, producing absolute clean silence.
   */
  playVibrationAcousticLeak(isMuted: boolean, durationMs: number = 250) {
    if (isMuted) {
      // When muted simultaneously, zero motor buzz reaches the receiver!
      return;
    }

    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      // Create mechanical motor rumble + high vibration harmonics
      const osc = ctx.createOscillator();
      const noiseGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(175, now); // Typical linear resonant actuator / ERM motor resonance

      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // Ignore
    }
  }

  /**
   * Play a clean, subtle connect chime / haptic simulation click
   */
  playHapticClickSound() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  /**
   * Play call end tone (3 beeps)
   */
  playCallEndTone() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const beepDuration = 0.12;

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + (i * 0.18);

        osc.frequency.setValueAtTime(425, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + beepDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + beepDuration);
      }
    } catch {}
  }
}

export const audioSynth = new AudioSynthesizer();
