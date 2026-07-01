/**
 * Score Service - Placeholder for backend score operations
 * Currently uses localStorage, designed to swap in real API calls later
 */

import type { SessionStats } from '../engine/types';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  accuracy: number;
  averageReactionTime: number;
  timestamp: number;
}

interface StoredScore extends SessionStats {
  savedAt: number;
}

const SCORES_KEY = 'aim-trainer-scores';
const LEADERBOARD_KEY = 'aim-trainer-leaderboard';

/**
 * Save a score from a completed session
 * Future: POST /api/scores
 */
export async function saveScore(stats: SessionStats): Promise<void> {
  console.log('[ScoreService] Saving score:', stats);
  
  try {
    const scores = getLocalScores();
    const storedScore: StoredScore = {
      ...stats,
      savedAt: Date.now(),
    };
    scores.push(storedScore);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('[ScoreService] Failed to save score:', e);
    throw e;
  }
}

/**
 * Get all scores for the current user
 * Future: GET /api/scores
 */
export async function getScores(): Promise<SessionStats[]> {
  console.log('[ScoreService] Fetching scores');
  
  try {
    return getLocalScores();
  } catch (e) {
    console.error('[ScoreService] Failed to fetch scores:', e);
    throw e;
  }
}

/**
 * Get leaderboard entries
 * Future: GET /api/leaderboard
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  console.log('[ScoreService] Fetching leaderboard, limit:', limit);
  
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    if (stored) {
      const entries: LeaderboardEntry[] = JSON.parse(stored);
      return entries
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
    return [];
  } catch (e) {
    console.error('[ScoreService] Failed to fetch leaderboard:', e);
    throw e;
  }
}

/**
 * Submit score to leaderboard
 * Future: POST /api/leaderboard
 */
export async function submitToLeaderboard(
  playerName: string,
  stats: SessionStats
): Promise<LeaderboardEntry> {
  console.log('[ScoreService] Submitting to leaderboard:', playerName, stats);
  
  const entry: LeaderboardEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerName,
    score: stats.score,
    accuracy: stats.accuracy,
    averageReactionTime: stats.averageReactionTime,
    timestamp: Date.now(),
  };
  
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    const entries: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];
    entries.push(entry);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    return entry;
  } catch (e) {
    console.error('[ScoreService] Failed to submit to leaderboard:', e);
    throw e;
  }
}

/**
 * Helper to get scores from localStorage
 */
function getLocalScores(): StoredScore[] {
  const stored = localStorage.getItem(SCORES_KEY);
  return stored ? JSON.parse(stored) : [];
}
