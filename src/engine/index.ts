/**
 * Engine barrel export
 * Framework-agnostic game engine components
 */

export { Camera } from './Camera';
export { Projection } from './Projection';
export { TargetManager, type TargetManagerConfig } from './TargetManager';
export { HitDetection } from './HitDetection';
export { GameLoop } from './GameLoop';

export {
  type EngineConfig,
  type Target,
  type SessionStats,
  type CameraState,
  type ScreenPosition,
  type ProjectedTarget,
  type HitResult,
  type GameState,
  type OnStatsUpdateCallback,
  type OnGameStateChangeCallback,
  DEFAULT_CONFIG,
} from './types';
