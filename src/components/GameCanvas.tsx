/**
 * GameCanvas - Mounts canvas, owns GameLoop instance via useRef/useEffect
 * Never re-renders mid-game
 */

import { useEffect, useState, useCallback, memo } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { StatsOverlay } from './StatsOverlay';
import { PreGameModal } from './PreGameModal';

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

  // Show pre-game modal when not running
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({
        hits: stats.hits,
        accuracy: stats.accuracy,
        avgReaction: stats.averageReactionTime,
      });
    }
  }, [stats, onStatsChange]);

  // When game stops, show the modal again
  useEffect(() => {
    if (!isRunning) {
      setShowModal(true);
    }
  }, [isRunning]);

  const handleStart = useCallback((targetCount: number) => {
    setShowModal(false);
    start(targetCount);
  }, [start]);

  const handleStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  }, [stop]);

  const handleResumeClick = useCallback(() => {
    // clicking outside paused content resumes (handled by canvas click)
  }, []);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
      />

      {/* Pre-game modal: shown when not running */}
      {!isRunning && showModal && (
        <PreGameModal onStart={handleStart} />
      )}

      {/* Paused overlay: game is running but pointer escaped */}
      {isRunning && !isPointerLocked && (
        <div className="paused-overlay" onClick={handleResumeClick} style={{ cursor: 'pointer' }}>
          <div className="paused-content" onClick={(e) => e.stopPropagation()}>
            <h2>Paused</h2>
            <p>Move mouse back to resume</p>
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
