/**
 * CrosshairCustomizer - CS2-style crosshair customization panel
 */

import { useState, useEffect, memo, useCallback } from 'react';
import { crosshairStore } from '../state/crosshairStore';
import { CROSSHAIR_PRESETS, isCS2Code, cs2SettingsToConfig, DEFAULT_CS2_SETTINGS } from '../engine/crosshairTypes';
import type { CrosshairConfig, CrosshairStyle, CS2CrosshairSettings } from '../engine/crosshairTypes';

export const CrosshairCustomizer = memo(function CrosshairCustomizer() {
  const [config, setConfig] = useState<CrosshairConfig>(crosshairStore.getConfig());
  const [importCode, setImportCode] = useState('');
  const [exportCode, setExportCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importError, setImportError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [_isCS2Format, setIsCS2Format] = useState(false);
  const [showCS2Manual, setShowCS2Manual] = useState(false);
  const [cs2Settings, setCS2Settings] = useState<CS2CrosshairSettings>(DEFAULT_CS2_SETTINGS);

  useEffect(() => {
    const unsubscribe = crosshairStore.subscribe(setConfig);
    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<CrosshairConfig>) => {
    crosshairStore.updateConfig(updates);
  }, []);

  const handlePresetChange = useCallback((presetName: string) => {
    const preset = CROSSHAIR_PRESETS[presetName];
    if (preset) {
      crosshairStore.setConfig(preset);
    }
  }, []);

  const handleExport = useCallback(() => {
    const code = crosshairStore.exportCode();
    setExportCode(code);
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, []);

  const handleImportCodeChange = useCallback((value: string) => {
    setImportCode(value);
    setImportError(false);
    setImportSuccess(false);
    setIsCS2Format(isCS2Code(value));
  }, []);

  const handleImport = useCallback(() => {
    if (crosshairStore.importCode(importCode)) {
      setImportSuccess(true);
      setImportError(false);
      setTimeout(() => {
        setImportCode('');
        setImportSuccess(false);
        setIsCS2Format(false);
      }, 1500);
    } else {
      setImportError(true);
      setImportSuccess(false);
      setTimeout(() => setImportError(false), 2000);
    }
  }, [importCode]);

  const handleReset = useCallback(() => {
    crosshairStore.resetConfig();
  }, []);

  const updateCS2Setting = useCallback(<K extends keyof CS2CrosshairSettings>(
    key: K, 
    value: CS2CrosshairSettings[K]
  ) => {
    setCS2Settings(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyCS2Settings = useCallback(() => {
    const converted = cs2SettingsToConfig(cs2Settings);
    crosshairStore.setConfig(converted);
    setShowCS2Manual(false);
  }, [cs2Settings]);

  return (
    <div className="crosshair-customizer">
      <h3>Crosshair</h3>

      {/* Preview */}
      <div className="crosshair-preview">
        <CrosshairPreview config={config} />
      </div>

      {/* Presets */}
      <div className="setting-row">
        <label>Preset</label>
        <select
          value=""
          onChange={(e) => handlePresetChange(e.target.value)}
          className="preset-select"
        >
          <option value="" disabled>Choose preset...</option>
          {Object.keys(CROSSHAIR_PRESETS).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Style */}
      <div className="setting-row">
        <label>Style</label>
        <select
          value={config.style}
          onChange={(e) => updateConfig({ style: e.target.value as CrosshairStyle })}
          className="style-select"
        >
          <option value="default">Default</option>
          <option value="classic">Classic</option>
          <option value="cross">Cross</option>
          <option value="circle">Circle</option>
          <option value="dot">Dot Only</option>
        </select>
      </div>

      {/* Color */}
      <div className="setting-row">
        <label>Color</label>
        <div className="color-input-group">
          <input
            type="color"
            value={config.color}
            onChange={(e) => updateConfig({ color: e.target.value })}
            className="color-picker"
          />
          <input
            type="text"
            value={config.color}
            onChange={(e) => updateConfig({ color: e.target.value })}
            className="color-text"
          />
        </div>
      </div>

      {/* Size */}
      <div className="setting-row">
        <label>Size</label>
        <div className="setting-input-group">
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={config.size}
            onChange={(e) => updateConfig({ size: parseInt(e.target.value) })}
          />
          <span className="value-display">{config.size}</span>
        </div>
      </div>

      {/* Gap */}
      <div className="setting-row">
        <label>Gap</label>
        <div className="setting-input-group">
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={config.gap}
            onChange={(e) => updateConfig({ gap: parseInt(e.target.value) })}
          />
          <span className="value-display">{config.gap}</span>
        </div>
      </div>

      {/* Thickness */}
      <div className="setting-row">
        <label>Thickness</label>
        <div className="setting-input-group">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={config.thickness}
            onChange={(e) => updateConfig({ thickness: parseInt(e.target.value) })}
          />
          <span className="value-display">{config.thickness}</span>
        </div>
      </div>

      {/* Dot */}
      <div className="setting-row checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={config.dot}
            onChange={(e) => updateConfig({ dot: e.target.checked })}
          />
          Center Dot
        </label>
        {config.dot && (
          <div className="setting-input-group inline">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.dotSize}
              onChange={(e) => updateConfig({ dotSize: parseInt(e.target.value) })}
            />
            <span className="value-display">{config.dotSize}</span>
          </div>
        )}
      </div>

      {/* Outline */}
      <div className="setting-row checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={config.outline}
            onChange={(e) => updateConfig({ outline: e.target.checked })}
          />
          Outline
        </label>
        {config.outline && (
          <>
            <input
              type="color"
              value={config.outlineColor}
              onChange={(e) => updateConfig({ outlineColor: e.target.value })}
              className="color-picker small"
            />
            <div className="setting-input-group inline">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={config.outlineThickness}
                onChange={(e) => updateConfig({ outlineThickness: parseInt(e.target.value) })}
              />
              <span className="value-display">{config.outlineThickness}</span>
            </div>
          </>
        )}
      </div>

      {/* T-Style */}
      <div className="setting-row checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={config.tStyle}
            onChange={(e) => updateConfig({ tStyle: e.target.checked })}
          />
          T-Style (no top line)
        </label>
      </div>

      {/* Opacity */}
      <div className="setting-row">
        <label>Opacity</label>
        <div className="setting-input-group">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={config.opacity}
            onChange={(e) => updateConfig({ opacity: parseInt(e.target.value) })}
          />
          <span className="value-display">{config.opacity}%</span>
        </div>
      </div>

      {/* Import/Export */}
      <div className="crosshair-codes">
        <h4>Share Crosshair</h4>
        
        <div className="code-section">
          <button onClick={handleExport} className="export-btn">
            {copySuccess ? 'Copied!' : 'Copy Code'}
          </button>
          {exportCode && (
            <input
              type="text"
              value={exportCode}
              readOnly
              className="code-display"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          )}
        </div>

        <div className="code-section import-section">
          <input
            type="text"
            value={importCode}
            onChange={(e) => handleImportCodeChange(e.target.value)}
            placeholder="Paste AIM- code..."
            className={`code-input ${importError ? 'error' : ''} ${importSuccess ? 'success' : ''}`}
          />
          <button 
            onClick={handleImport} 
            className={`import-btn ${importSuccess ? 'success' : ''}`}
            disabled={!importCode.trim()}
          >
            {importSuccess ? 'Applied!' : 'Import'}
          </button>
        </div>

        <button 
          onClick={() => setShowCS2Manual(!showCS2Manual)} 
          className="cs2-manual-toggle"
        >
          <span className="cs2-badge">CS2</span>
          {showCS2Manual ? 'Hide CS2 Settings' : 'Import from CS2 Settings'}
        </button>

        {showCS2Manual && (
          <div className="cs2-manual-settings">
            <p className="cs2-help">Enter the values from your CS2 crosshair settings:</p>
            
            <div className="cs2-grid">
              <div className="cs2-field">
                <label>Style</label>
                <select 
                  value={cs2Settings.style}
                  onChange={(e) => updateCS2Setting('style', e.target.value as CS2CrosshairSettings['style'])}
                >
                  <option value="default">Default</option>
                  <option value="default_static">Default Static</option>
                  <option value="classic">Classic</option>
                  <option value="classic_static">Classic Static</option>
                  <option value="classic_dynamic">Classic Dynamic</option>
                </select>
              </div>

              <div className="cs2-field">
                <label>Length</label>
                <input 
                  type="number" 
                  min="0.5" 
                  max="10" 
                  step="0.5"
                  value={cs2Settings.length}
                  onChange={(e) => updateCS2Setting('length', parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="cs2-field">
                <label>Thickness</label>
                <input 
                  type="number" 
                  min="0" 
                  max="6" 
                  step="0.5"
                  value={cs2Settings.thickness}
                  onChange={(e) => updateCS2Setting('thickness', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="cs2-field">
                <label>Gap</label>
                <input 
                  type="number" 
                  min="-5" 
                  max="5" 
                  step="1"
                  value={cs2Settings.gap}
                  onChange={(e) => updateCS2Setting('gap', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="cs2-field">
                <label>Color</label>
                <select 
                  value={cs2Settings.color}
                  onChange={(e) => updateCS2Setting('color', e.target.value as CS2CrosshairSettings['color'])}
                >
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="blue">Blue</option>
                  <option value="cyan">Cyan</option>
                  <option value="custom">Custom RGB</option>
                </select>
              </div>

              <div className="cs2-field">
                <label>Alpha</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  step="1"
                  value={cs2Settings.alpha}
                  onChange={(e) => updateCS2Setting('alpha', parseInt(e.target.value) || 255)}
                />
              </div>

              {cs2Settings.color === 'custom' && (
                <>
                  <div className="cs2-field">
                    <label>Red</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255"
                      value={cs2Settings.red}
                      onChange={(e) => updateCS2Setting('red', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="cs2-field">
                    <label>Green</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255"
                      value={cs2Settings.green}
                      onChange={(e) => updateCS2Setting('green', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="cs2-field">
                    <label>Blue</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255"
                      value={cs2Settings.blue}
                      onChange={(e) => updateCS2Setting('blue', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="cs2-checkboxes">
              <label>
                <input 
                  type="checkbox" 
                  checked={cs2Settings.dot}
                  onChange={(e) => updateCS2Setting('dot', e.target.checked)}
                />
                Dot
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={cs2Settings.outline}
                  onChange={(e) => updateCS2Setting('outline', e.target.checked)}
                />
                Outline
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={cs2Settings.tStyle}
                  onChange={(e) => updateCS2Setting('tStyle', e.target.checked)}
                />
                T Style
              </label>
            </div>

            <button onClick={applyCS2Settings} className="cs2-apply-btn">
              Apply CS2 Crosshair
            </button>
          </div>
        )}
      </div>

      <button onClick={handleReset} className="reset-button">
        Reset to Default
      </button>
    </div>
  );
});

/**
 * Crosshair Preview Component
 */
function CrosshairPreview({ config }: { config: CrosshairConfig }) {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const x = width / 2;
    const y = height / 2;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw crosshair
    const { size, gap, thickness, dot, dotSize, outline, outlineThickness, tStyle, style, opacity } = config;
    const alpha = opacity / 100;

    ctx.save();
    ctx.globalAlpha = alpha;

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      if (outline) {
        ctx.strokeStyle = config.outlineColor;
        ctx.lineWidth = thickness + outlineThickness * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.strokeStyle = config.color;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    if (style === 'circle') {
      if (outline) {
        ctx.strokeStyle = config.outlineColor;
        ctx.lineWidth = thickness + outlineThickness * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = config.color;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (style !== 'dot' && size > 0) {
      drawLine(x - size - gap, y, x - gap, y);
      drawLine(x + gap, y, x + size + gap, y);
      if (!tStyle) {
        drawLine(x, y - size - gap, x, y - gap);
      }
      drawLine(x, y + gap, x, y + size + gap);
    }

    if (dot && dotSize > 0) {
      if (outline) {
        ctx.fillStyle = config.outlineColor;
        ctx.beginPath();
        ctx.arc(x, y, dotSize + outlineThickness, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="crosshair-preview-canvas"
    />
  );
}
