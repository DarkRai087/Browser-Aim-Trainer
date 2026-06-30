/**
 * useGameEngine - Bridges engine instance lifecycle to React
 * Exposes minimal state to components, keeps game loop outside React's render cycle
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { GameLoop } from '../engine/GameLoop';
import type { SessionStats, GameState, EngineConfig } from '../engine/types';
import { settingsStore } from '../state/settingsStore';
import { saveScore } from '../services/scoreService';

interface UseGameEngineReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRunning: boolean;
  isPointerLocked: boolean;
  stats: SessionStats;
  start: (targetCount?: number) => void;
  stop: () => void;
  updateSettings: (settings: Partial<EngineConfig>) => void;
}

const createEmptyStats = (): SessionStats => ({
  hits: 0,
  misses: 0,
  totalShots: 0,
  accuracy: 0,
  reactionTimes: [],
  averageReactionTime: 0,
  startedAt: 0,
  duration: 0,
  score: 0,
  targetCount: 0,
});

export function useGameEngine(): UseGameEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [stats, setStats] = useState<SessionStats>(createEmptyStats());

  const handleStatsUpdate = useCallback((newStats: SessionStats) => {
    setStats(newStats);
  }, []);

  const handleGameStateChange = useCallback((state: GameState) => {
    setIsRunning(state.isRunning);
    setIsPointerLocked(state.isPointerLocked);
  }, []);

  const initializeEngine = useCallback(() => {
    if (!canvasRef.current || gameLoopRef.current) return;

    const canvas = canvasRef.current;
    const settings = settingsStore.getSettings();
    
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;

    const gameLoop = new GameLoop(canvas, {
      ...settings,
      width,
      height,
    });

    gameLoop.setCallbacks(handleStatsUpdate, handleGameStateChange);
    gameLoopRef.current = gameLoop;
    
    gameLoop.renderIdle();
  }, [handleStatsUpdate, handleGameStateChange]);

  const start = useCallback((targetCount?: number) => {
    if (!gameLoopRef.current && canvasRef.current) {
      initializeEngine();
    }
    // Apply target count before starting
    if (targetCount !== undefined) {
      gameLoopRef.current?.updateConfig({ targetCount });
    }
    gameLoopRef.current?.start();
  }, [initializeEngine]);

  const stop = useCallback(async () => {
    if (gameLoopRef.current) {
      const finalStats = gameLoopRef.current.getStats();
      gameLoopRef.current.stop();
      
      if (finalStats.totalShots > 0) {
        try {
          await saveScore(finalStats);
        } catch (e) {
          console.error('Failed to save score:', e);
        }
      }
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<EngineConfig>) => {
    settingsStore.updateSettings(newSettings);
    gameLoopRef.current?.updateConfig(newSettings);
  }, []);

  useEffect(() => {
    const initTimeout = setTimeout(() => {
      initializeEngine();
    }, 50);

    const handleResize = () => {
      if (canvasRef.current && gameLoopRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;
        gameLoopRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    const unsubscribe = settingsStore.subscribe((settings) => {
      gameLoopRef.current?.updateConfig(settings);
    });

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener('resize', handleResize);
      unsubscribe();
      gameLoopRef.current?.destroy();
      gameLoopRef.current = null;
    };
  }, [initializeEngine]);

  return {
    canvasRef,
    isRunning,
    isPointerLocked,
    stats,
    start,
    stop,
    updateSettings,
  };
}
