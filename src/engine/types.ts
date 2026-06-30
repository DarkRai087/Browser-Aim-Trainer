/**
 * Engine Types - Framework-agnostic type definitions
 * These types are designed for serialization and future backend integration
 */

/** Engine configuration - can be persisted/loaded from backend */
export type EngineConfig = {
  /** Mouse sensitivity multiplier */
  sensitivity: number;
  /** Mouse DPI for cm/360 calculations */
  dpi: number;
  /** Field of view in degrees */
  fov: number;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
};

/** Default engine configuration */
export const DEFAULT_CONFIG: EngineConfig = {
  sensitivity: 2.0,
  dpi: 800,
  fov: 103,
  width: 1920,
  height: 1080,
};

/** Target object - represents a clickable target in the game */
export type Target = {
  /** Unique identifier for the target */
  id: string;
  /** Horizontal angle from center in degrees */
  yaw: number;
  /** Vertical angle from center in degrees */
  pitch: number;
  /** Angular radius of the target in degrees */
  radius: number;
  /** Timestamp when target was spawned */
  spawnedAt: number;
  /** Whether target is currently active */
  active: boolean;
};

/** Session statistics - serializable for backend storage */
export type SessionStats = {
  /** Total number of hits */
  hits: number;
  /** Total number of misses */
  misses: number;
  /** Total shots fired */
  totalShots: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Array of reaction times in milliseconds */
  reactionTimes: number[];
  /** Average reaction time in milliseconds */
  averageReactionTime: number;
  /** Session start timestamp */
  startedAt: number;
  /** Session duration in milliseconds */
  duration: number;
  /** Score (can be calculated based on hits, speed, etc.) */
  score: number;
};

/** Camera state - current view orientation */
export type CameraState = {
  /** Horizontal rotation in degrees */
  yaw: number;
  /** Vertical rotation in degrees (clamped to ±90) */
  pitch: number;
};

/** Screen position for rendering */
export type ScreenPosition = {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Whether the position is visible on screen */
  visible: boolean;
};

/** Projected target with screen coordinates */
export type ProjectedTarget = Target & {
  /** Screen X position */
  screenX: number;
  /** Screen Y position */
  screenY: number;
  /** Screen radius in pixels */
  screenRadius: number;
  /** Whether target is visible on screen */
  visible: boolean;
};

/** Hit result from click detection */
export type HitResult = {
  /** Whether a target was hit */
  hit: boolean;
  /** The target that was hit (if any) */
  target: Target | null;
  /** Reaction time in milliseconds (if hit) */
  reactionTime: number | null;
};

/** Game state for UI updates */
export type GameState = {
  /** Whether the game is currently running */
  isRunning: boolean;
  /** Whether pointer is locked */
  isPointerLocked: boolean;
  /** Current session statistics */
  stats: SessionStats;
  /** Current camera state */
  camera: CameraState;
};

/** Callback types for engine events */
export type OnStatsUpdateCallback = (stats: SessionStats) => void;
export type OnGameStateChangeCallback = (state: GameState) => void;
