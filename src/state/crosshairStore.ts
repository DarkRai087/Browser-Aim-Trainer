/**
 * Crosshair Store - Manages crosshair customization
 */

import { DEFAULT_CROSSHAIR, encodeCrosshair, decodeCrosshair } from '../engine/crosshairTypes';
import type { CrosshairConfig } from '../engine/crosshairTypes';

type CrosshairListener = (config: CrosshairConfig) => void;

class CrosshairStore {
  private config: CrosshairConfig;
  private listeners: Set<CrosshairListener> = new Set();
  private storageKey = 'aim-trainer-crosshair';

  constructor() {
    this.config = this.loadFromStorage();
  }

  private loadFromStorage(): CrosshairConfig {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CROSSHAIR, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load crosshair from storage:', e);
    }
    return { ...DEFAULT_CROSSHAIR };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save crosshair to storage:', e);
    }
  }

  getConfig(): CrosshairConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CrosshairConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  setConfig(config: CrosshairConfig): void {
    this.config = { ...config };
    this.saveToStorage();
    this.notifyListeners();
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CROSSHAIR };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Export current crosshair as shareable code
   */
  exportCode(): string {
    return encodeCrosshair(this.config);
  }

  /**
   * Import crosshair from code
   * Returns true if successful
   */
  importCode(code: string): boolean {
    const decoded = decodeCrosshair(code.trim());
    if (decoded) {
      this.setConfig(decoded);
      return true;
    }
    return false;
  }

  subscribe(listener: CrosshairListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const currentConfig = this.getConfig();
    this.listeners.forEach(listener => listener(currentConfig));
  }
}

export const crosshairStore = new CrosshairStore();
