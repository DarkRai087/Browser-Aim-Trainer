/**
 * Settings Store - Manages sensitivity/DPI/FOV configuration
 * Designed to be easily swapped for persisted/remote state in the future
 */

import { DEFAULT_CONFIG } from '../engine/types';
import type { EngineConfig } from '../engine/types';

type SettingsListener = (settings: EngineConfig) => void;

class SettingsStore {
  private settings: EngineConfig;
  private listeners: Set<SettingsListener> = new Set();
  private storageKey = 'aim-trainer-settings';

  constructor() {
    this.settings = this.loadFromStorage();
  }

  /**
   * Load settings from localStorage (or return defaults)
   */
  private loadFromStorage(): EngineConfig {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save settings to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings to storage:', e);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): EngineConfig {
    return { ...this.settings };
  }

  /**
   * Update settings (partial update supported)
   */
  updateSettings(updates: Partial<EngineConfig>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_CONFIG };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(): void {
    const currentSettings = this.getSettings();
    this.listeners.forEach(listener => listener(currentSettings));
  }
}

export const settingsStore = new SettingsStore();
