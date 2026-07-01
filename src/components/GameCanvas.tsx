/**
 * GameCanvas - Mounts canvas, owns GameLoop instance via useRef/useEffect
 * Never re-renders mid-game
 */

import { useEffect, useState, useCallback, memo } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { StatsOverlay } from './StatsOverlay';
import { PreGameMenu } from './PreGameMenu';
import type { GameModeType } from '../engine/gameModes';

interface GameCanvasProps {
  onStatsChange?: (stats: { hits: number; accuracy: number; avgReaction: number }) => void;
  onOpenSettings?: () => void;
}

export const GameCanvas = memo(function GameCanvas({ onStatsChange, onOpenSettings }: GameCanvasProps) {
  const {
    canvasRef,
    isRunning,
    isPointerLocked,
    stats,
    start,
    stop,
  } = useGameEngine();

  // Show pre-game menu when not running
  const [showMenu, setShowMenu] = useState(true);
  const [currentMode, setCurrentMode] = useState<GameModeType | null>(null);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({
        hits: stats.hits,
        accuracy: stats.accuracy,
        avgReaction: stats.averageReactionTime,
      });
    }
  }, [stats, onStatsChange]);

  // When game stops, show the menu again
  useEffect(() => {
    if (!isRunning) {
      setShowMenu(true);
      setCurrentMode(null);
    }
  }, [isRunning]);

  const handleStart = useCallback((mode: GameModeType, weapon?: string) => {
    setShowMenu(false);
    setCurrentMode(mode);
    start(mode, weapon);
  }, [start]);

  const handleStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  }, [stop]);

  const handleOpenSettings = useCallback(() => {
    onOpenSettings?.();
  }, [onOpenSettings]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
      />

      {/* Pre-game menu: shown when not running */}
      {!isRunning && showMenu && (
        <PreGameMenu onStart={handleStart} onSettings={handleOpenSettings} />
      )}

      {/* Paused overlay: game is running but pointer escaped */}
      {isRunning && !isPointerLocked && (
        <div className="paused-overlay" style={{ cursor: 'pointer' }}>
          <div className="paused-content" onClick={(e) => e.stopPropagation()}>
            <h2>Paused</h2>
            <p>Move mouse back to canvas to resume</p>
            <button onClick={handleStop} className="stop-button">
              End Session
            </button>
          </div>
        </div>
      )}

      {/* End button - always visible when running */}
      {isRunning && isPointerLocked && (
        <button 
          className="end-game-button"
          onClick={handleStop}
        >
          End
        </button>
      )}

      {/* Stats overlay - only show in flick mode (spray mode draws its own stats) */}
      {isRunning && currentMode === 'flick' && (
        <StatsOverlay stats={stats} />
      )}
    </div>
  );
});
