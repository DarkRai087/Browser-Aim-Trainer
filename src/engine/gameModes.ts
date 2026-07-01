/**
 * Game Modes Configuration
 */

export type GameModeType = 'flick' | 'spray' | 'tracking';

export type GameMode = {
  id: GameModeType;
  name: string;
  description: string;
  icon: string;
};

export const GAME_MODES: GameMode[] = [
  {
    id: 'flick',
    name: 'Flick Training',
    description: 'Click on targets as fast as you can',
    icon: '🎯',
  },
  {
    id: 'spray',
    name: 'Spray Control',
    description: 'Learn weapon spray patterns (CS2)',
    icon: '💥',
  },
];

export const DEFAULT_MODE: GameModeType = 'flick';
