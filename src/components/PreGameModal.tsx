/**
 * PreGameModal - Shown before session starts, lets user pick a target count
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';

interface PreGameModalProps {
  onStart: (targetCount: number) => void;
}

const PRESETS = [
  { label: '10', value: 10, icon: '🎯', desc: 'Quick warm-up' },
  { label: '50', value: 50, icon: '⚡', desc: 'Standard session' },
  { label: '100', value: 100, icon: '🔥', desc: 'Full challenge' },
] as const;

export const PreGameModal = memo(function PreGameModal({ onStart }: PreGameModalProps) {
  const [selected, setSelected] = useState<number | 'custom'>(50);
  const [customValue, setCustomValue] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const customInputRef = useRef<HTMLInputElement>(null);

  // Focus custom input when "Custom" is selected
  useEffect(() => {
    if (selected === 'custom') {
      customInputRef.current?.focus();
    }
  }, [selected]);

  const getTargetCount = useCallback((): number | null => {
    if (selected === 'custom') {
      const n = parseInt(customValue, 10);
      if (isNaN(n) || n < 1 || n > 9999) return null;
      return n;
    }
    return selected as number;
  }, [selected, customValue]);

  const handleStart = useCallback(() => {
    const count = getTargetCount();
    if (count === null) {
      setCustomError('Enter a number between 1 and 9999');
      customInputRef.current?.focus();
      return;
    }
    onStart(count);
  }, [getTargetCount, onStart]);

  const handleCustomChange = useCallback((v: string) => {
    setCustomValue(v);
    setCustomError('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart();
  }, [handleStart]);

  return (
    <div className="pregame-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="pregame-card">
        {/* Header */}
        <div className="pregame-header">
          <div className="pregame-logo">
            <span className="pregame-logo-icon">🎯</span>
            <span className="pregame-logo-text">FPS Aim Trainer</span>
          </div>
          <p className="pregame-subtitle">Choose how many targets to hit this session</p>
        </div>

        {/* Preset buttons */}
        <div className="pregame-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={`pregame-preset-btn${selected === preset.value ? ' active' : ''}`}
              onClick={() => { setSelected(preset.value); setCustomError(''); }}
              aria-pressed={selected === preset.value}
            >
              <span className="preset-icon">{preset.icon}</span>
              <span className="preset-number">{preset.label}</span>
              <span className="preset-desc">{preset.desc}</span>
            </button>
          ))}

          {/* Custom option */}
          <button
            className={`pregame-preset-btn custom${selected === 'custom' ? ' active' : ''}`}
            onClick={() => setSelected('custom')}
            aria-pressed={selected === 'custom'}
          >
            <span className="preset-icon">✏️</span>
            <span className="preset-number">Custom</span>
            <span className="preset-desc">Your number</span>
          </button>
        </div>

        {/* Custom input (only visible when custom is selected) */}
        <div className={`pregame-custom-input-wrap${selected === 'custom' ? ' visible' : ''}`}>
          <div className="pregame-custom-input-row">
            <input
              ref={customInputRef}
              id="custom-target-count"
              type="number"
              min={1}
              max={9999}
              value={customValue}
              placeholder="e.g. 25"
              onChange={e => handleCustomChange(e.target.value)}
              className={`pregame-custom-input${customError ? ' error' : ''}`}
              aria-label="Custom target count"
            />
            <span className="pregame-custom-label">targets</span>
          </div>
          {customError && <p className="pregame-custom-error">{customError}</p>}
        </div>

        {/* Summary */}
        <div className="pregame-summary">
          <span className="pregame-summary-text">
            {selected === 'custom'
              ? customValue
                ? `Hit ${customValue} targets`
                : 'Enter a custom number above'
              : `Hit ${selected} targets`}
          </span>
        </div>

        {/* Start button */}
        <button
          id="pregame-start-btn"
          className="pregame-start-btn"
          onClick={handleStart}
        >
          <span className="pregame-start-text">Start Session</span>
          <span className="pregame-start-arrow">→</span>
        </button>

        {/* Instructions */}
        <div className="pregame-instructions">
          <span>🖱 Move mouse to aim</span>
          <span>🖱 Click to shoot</span>
          <span>⎋ ESC to pause</span>
        </div>
      </div>
    </div>
  );
});
