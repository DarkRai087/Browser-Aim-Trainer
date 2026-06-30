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

  const hitsDisplay = stats.targetCount > 0
    ? `${stats.hits} / ${stats.targetCount}`
    : `${stats.hits}`;

  const progress = stats.targetCount > 0
    ? Math.min(100, (stats.hits / stats.targetCount) * 100)
    : null;

  return (
    <div className="stats-overlay">
      <div className="stat-item">
        <span className="stat-label">Hits</span>
        <span className="stat-value">{hitsDisplay}</span>
      </div>

      {progress !== null && (
        <div className="stat-progress-bar-wrap">
          <div
            className="stat-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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
