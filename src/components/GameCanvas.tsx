/**
 * GameCanvas - Mounts canvas, owns GameLoop instance via useRef/useEffect
 * Never re-renders mid-game
 */

import { useEffect, memo } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { StatsOverlay } from './StatsOverlay';

interface GameCanvasProps {
  onStatsChange?: (stats: { hits: number; accuracy: number; avgReaction: number }) => void;
}

export const GameCanvas = memo(function GameCanvas({ onStatsChange }: GameCanvasProps) {
  const {
    canvasRef,
    isRunning,
    isPointerLocked,
    stats,
    start,
    stop,
  } = useGameEngine();

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({
        hits: stats.hits,
        accuracy: stats.accuracy,
        avgReaction: stats.averageReactionTime,
      });
    }
  }, [stats, onStatsChange]);

  const handleCanvasClick = () => {
    if (!isRunning) {
      start();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onClick={handleCanvasClick}
      />
      
      {!isRunning && (
        <div className="start-overlay">
          <div className="start-content">
            <h2>FPS Aim Trainer</h2>
            <p>Click to start</p>
            <div className="instructions">
              <p>Move mouse to aim</p>
              <p>Click to shoot targets</p>
              <p>Press ESC to pause</p>
            </div>
          </div>
        </div>
      )}

      {isRunning && !isPointerLocked && (
        <div className="paused-overlay">
          <div className="paused-content">
            <h2>Paused</h2>
            <p>Click to resume</p>
            <button onClick={handleStop} className="stop-button">
              End Session
            </button>
          </div>
        </div>
      )}

      {isRunning && (
        <StatsOverlay stats={stats} />
      )}
    </div>
  );
});
