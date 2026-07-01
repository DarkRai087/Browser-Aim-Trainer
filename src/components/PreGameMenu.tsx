/**
 * PreGameMenu - Mode selection before starting the game
 */

import { useState, memo } from 'react';
import { GAME_MODES } from '../engine/gameModes';
import { PATTERN_LIST } from '../engine/sprayPatterns';
import type { GameModeType } from '../engine/gameModes';

interface PreGameMenuProps {
  onStart: (mode: GameModeType, weapon?: string) => void;
  onSettings: () => void;
}

export const PreGameMenu = memo(function PreGameMenu({ onStart, onSettings }: PreGameMenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameModeType>('flick');
  const [selectedWeapon, setSelectedWeapon] = useState('ak47');

  const handleStart = () => {
    onStart(selectedMode, selectedMode === 'spray' ? selectedWeapon : undefined);
  };

  return (
    <div className="pregame-menu">
      <div className="pregame-header">
        <h1 className="pregame-title">
          <span className="title-icon">🎯</span>
          Aim Trainer
        </h1>
        <button className="pregame-settings-btn" onClick={onSettings} title="Settings">
          ⚙
        </button>
      </div>

      <div className="pregame-content">
        <div className="mode-section">
          <h2>Select Mode</h2>
          <div className="mode-grid">
            {GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <span className="mode-icon">{mode.icon}</span>
                <span className="mode-name">{mode.name}</span>
                <span className="mode-desc">{mode.description}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedMode === 'spray' && (
          <div className="weapon-section">
            <h2>Select Weapon</h2>
            <div className="weapon-grid">
              {PATTERN_LIST.map((weapon) => (
                <button
                  key={weapon.id}
                  className={`weapon-card ${selectedWeapon === weapon.id ? 'selected' : ''}`}
                  onClick={() => setSelectedWeapon(weapon.id)}
                >
                  <span className="weapon-name">{weapon.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="start-btn" onClick={handleStart}>
          {selectedMode === 'spray' ? 'Start Training' : 'Start Game'}
        </button>

        <div className="pregame-tips">
          {selectedMode === 'flick' && (
            <p>Move your mouse to aim the crosshair at targets. Click to shoot.</p>
          )}
          {selectedMode === 'spray' && (
            <p>Hold click and follow the pattern. Pull your mouse opposite to the recoil.</p>
          )}
        </div>
      </div>
    </div>
  );
});
