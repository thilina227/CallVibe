/**
 * Vibration Service supporting Web Vibration API with fallback
 */

export interface VibrationFeedback {
  isSupported: boolean;
  durationMs: number;
  pattern: number[];
}

class VibrationService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function';
  }

  /**
   * Trigger the 1/4 second (250ms) call-connected vibration
   */
  vibrate(durationMs: number = 250, patternType: 'gentle' | 'normal' | 'crisp' = 'normal'): VibrationFeedback {
    const supported = this.isSupported();
    let pattern: number[];

    if (patternType === 'gentle') {
      // Shorter, softer pulse
      pattern = [Math.max(80, Math.round(durationMs * 0.6))];
    } else if (patternType === 'crisp') {
      // Crisp 250ms single shot
      pattern = [durationMs];
    } else {
      // Default standard 250ms pulse
      pattern = [durationMs];
    }

    if (supported) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Handle devices blocking vibration without direct gesture
      }
    }

    return {
      isSupported: supported,
      durationMs,
      pattern,
    };
  }

  /**
   * Stop any active vibration immediately
   */
  cancel() {
    if (this.isSupported()) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }
}

export const vibrationService = new VibrationService();
