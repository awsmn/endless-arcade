/**
 * Mobile Haptic Vibration Driver.
 * Safe wrapper around Navigator.vibrate with pattern presets and toggle state.
 */
class HapticsEngine {
  private enabled: boolean = true;
  private supported: boolean = false;

  constructor() {
    this.supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled && this.supported;
  }

  public isSupported(): boolean {
    return this.supported;
  }

  private trigger(pattern: number | number[]) {
    if (!this.enabled || !this.supported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore mobile permission or background restrictions
    }
  }

  /**
   * Crisp micro-tap for UI buttons and subtle gestures (8-10ms)
   */
  public tap() {
    this.trigger(10);
  }

  /**
   * Medium bump for food eating, block breaking, or jumping (25ms)
   */
  public bump() {
    this.trigger(25);
  }

  /**
   * Impact or collision (50ms)
   */
  public impact() {
    this.trigger(50);
  }

  /**
   * Double burst for combos / achievements
   */
  public combo() {
    this.trigger([15, 30, 20]);
  }

  /**
   * Success fanfare pattern
   */
  public success() {
    this.trigger([25, 40, 35, 40, 50]);
  }

  /**
   * Failure / Game over pattern
   */
  public failure() {
    this.trigger([60, 80, 80]);
  }
}

export const haptics = new HapticsEngine();
