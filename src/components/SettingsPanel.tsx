/**
 * SettingsPanel - Sensitivity, DPI, FOV inputs
 */

import { useState, useEffect, memo, useCallback } from 'react';
import { settingsStore } from '../state/settingsStore';
import type { EngineConfig } from '../engine/types';
import { CrosshairCustomizer } from './CrosshairCustomizer';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const M_YAW = 0.022;

function calculateCmPer360(sensitivity: number, dpi: number): number {
  const countsPerDegree = 1 / (sensitivity * M_YAW);
  const countsFor360 = countsPerDegree * 360;
  const inchesPer360 = countsFor360 / dpi;
  return inchesPer360 * 2.54;
}

export const SettingsPanel = memo(function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<EngineConfig>(settingsStore.getSettings());
  const [cmPer360, setCmPer360] = useState<string>('');

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(setSettings);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setCmPer360(calculateCmPer360(settings.sensitivity, settings.dpi).toFixed(2));
  }, [settings.sensitivity, settings.dpi]);

  const handleSensitivityChange = useCallback((value: number) => {
    settingsStore.updateSettings({ sensitivity: value });
  }, []);

  const handleDpiChange = useCallback((value: number) => {
    settingsStore.updateSettings({ dpi: value });
  }, []);

  const handleFovChange = useCallback((value: number) => {
    settingsStore.updateSettings({ fov: value });
  }, []);

  const handleCmPer360Change = useCallback((value: string) => {
    setCmPer360(value);
    const cm = parseFloat(value);
    if (!isNaN(cm) && cm > 0) {
      const inchesPer360 = cm / 2.54;
      const countsFor360 = inchesPer360 * settings.dpi;
      const countsPerDegree = countsFor360 / 360;
      const newSensitivity = 1 / (countsPerDegree * M_YAW);
      if (newSensitivity > 0 && newSensitivity < 100) {
        settingsStore.updateSettings({ sensitivity: newSensitivity });
      }
    }
  }, [settings.dpi]);

  const handleReset = useCallback(() => {
    settingsStore.resetSettings();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Mouse Settings</h3>
            
            <div className="setting-row">
              <label htmlFor="sensitivity">Sensitivity</label>
              <div className="setting-input-group">
                <input
                  type="range"
                  id="sensitivity"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.sensitivity}
                  onChange={e => handleSensitivityChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={settings.sensitivity.toFixed(2)}
                  min="0.1"
                  max="10"
                  step="0.1"
                  onChange={e => handleSensitivityChange(parseFloat(e.target.value) || 0.1)}
                  className="number-input"
                />
              </div>
              <span className="setting-hint">CS:GO-style sensitivity (uses m_yaw 0.022)</span>
            </div>

            <div className="setting-row">
              <label htmlFor="dpi">Mouse DPI</label>
              <div className="setting-input-group">
                <input
                  type="range"
                  id="dpi"
                  min="100"
                  max="3200"
                  step="50"
                  value={settings.dpi}
                  onChange={e => handleDpiChange(parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={settings.dpi}
                  min="100"
                  max="16000"
                  step="50"
                  onChange={e => handleDpiChange(parseInt(e.target.value) || 800)}
                  className="number-input"
                />
              </div>
            </div>

            <div className="setting-row">
              <label htmlFor="cmPer360">cm/360</label>
              <div className="setting-input-group">
                <input
                  type="number"
                  id="cmPer360"
                  value={cmPer360}
                  min="1"
                  max="200"
                  step="0.5"
                  onChange={e => handleCmPer360Change(e.target.value)}
                  className="number-input wide"
                />
                <span className="unit">cm</span>
              </div>
              <span className="setting-hint">Centimeters to complete a 360° turn</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>Display Settings</h3>
            
            <div className="setting-row">
              <label htmlFor="fov">Field of View</label>
              <div className="setting-input-group">
                <input
                  type="range"
                  id="fov"
                  min="60"
                  max="120"
                  step="1"
                  value={settings.fov}
                  onChange={e => handleFovChange(parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={settings.fov}
                  min="60"
                  max="120"
                  step="1"
                  onChange={e => handleFovChange(parseInt(e.target.value) || 90)}
                  className="number-input"
                />
              </div>
              <span className="setting-hint">Horizontal field of view in degrees</span>
            </div>
          </div>

          <div className="settings-section">
            <CrosshairCustomizer />
          </div>

          <div className="settings-actions">
            <button onClick={handleReset} className="reset-button">
              Reset Mouse Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
