/**
 * StatsOverlay - Displays hits, accuracy, reaction time during gameplay
 */

import { memo } from 'react';
import type { SessionStats } from '../engine/types';

interface StatsOverlayProps {
  stats: SessionStats;
}

export const StatsOverlay = memo(function StatsOverlay({ stats }: StatsOverlayProps) {
  const formatTime = (ms: number): string => {
    if (ms === 0) return '--';
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="stats-overlay">
      <div className="stat-item">
        <span className="stat-label">Hits</span>
        <span className="stat-value">{stats.hits}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Accuracy</span>
        <span className="stat-value">{stats.accuracy.toFixed(1)}%</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Avg Time</span>
        <span className="stat-value">{formatTime(stats.averageReactionTime)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Score</span>
        <span className="stat-value score">{Math.round(stats.score)}</span>
      </div>
    </div>
  );
});
