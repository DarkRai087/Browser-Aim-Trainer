/**
 * TargetManager - Spawning and despawning circle targets
 * Pure TypeScript, no framework dependencies
 */

import type { Target } from './types';

export interface TargetManagerConfig {
  /** Minimum radius for targets in pixels */
  minRadius: number;
  /** Maximum radius for targets in pixels */
  maxRadius: number;
  /** Canvas width for spawn bounds */
  canvasWidth: number;
  /** Canvas height for spawn bounds */
  canvasHeight: number;
  /** Margin from edges in pixels */
  edgeMargin: number;
  /** Maximum number of active targets at once */
  maxActiveTargets: number;
  /** Minimum time between spawns in milliseconds */
  spawnCooldown: number;
}

const DEFAULT_TARGET_CONFIG: TargetManagerConfig = {
  minRadius: 30,
  maxRadius: 50,
  canvasWidth: 1920,
  canvasHeight: 1080,
  edgeMargin: 100,
  maxActiveTargets: 1,
  spawnCooldown: 100,
};

export class TargetManager {
  private targets: Map<string, Target> = new Map();
  private config: TargetManagerConfig;
  private nextTargetId: number = 0;
  private lastSpawnTime: number = 0;

  constructor(config: Partial<TargetManagerConfig> = {}) {
    this.config = { ...DEFAULT_TARGET_CONFIG, ...config };
  }

  /**
   * Generate a unique target ID
   */
  private generateId(): string {
    return `target_${this.nextTargetId++}`;
  }

  /**
   * Generate a random value within a range
   */
  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Spawn a new target at a random screen position
   * Returns the spawned target or null if spawn conditions not met
   */
  spawnTarget(currentTime: number = Date.now()): Target | null {
    // Check cooldown
    if (currentTime - this.lastSpawnTime < this.config.spawnCooldown) {
      return null;
    }

    // Check max active targets
    const activeCount = this.getActiveTargets().length;
    if (activeCount >= this.config.maxActiveTargets) {
      return null;
    }

    const radius = this.randomRange(this.config.minRadius, this.config.maxRadius);
    const margin = this.config.edgeMargin + radius;
    
    // Spawn within canvas bounds with margin
    const minX = margin;
    const maxX = this.config.canvasWidth - margin;
    const minY = margin;
    const maxY = this.config.canvasHeight - margin;

    const target: Target = {
      id: this.generateId(),
      yaw: this.randomRange(minX, maxX),     // Using yaw as screenX
      pitch: this.randomRange(minY, maxY),   // Using pitch as screenY
      radius: radius,                         // Screen radius in pixels
      spawnedAt: currentTime,
      active: true,
    };

    this.targets.set(target.id, target);
    this.lastSpawnTime = currentTime;

    return target;
  }

  /**
   * Spawn a target at a specific position (useful for testing)
   */
  spawnTargetAt(yaw: number, pitch: number, radius?: number): Target {
    const target: Target = {
      id: this.generateId(),
      yaw,
      pitch,
      radius: radius ?? this.randomRange(this.config.minRadius, this.config.maxRadius),
      spawnedAt: Date.now(),
      active: true,
    };

    this.targets.set(target.id, target);
    return target;
  }

  /**
   * Despawn a target by ID
   */
  despawnTarget(targetId: string): boolean {
    const target = this.targets.get(targetId);
    if (target) {
      target.active = false;
      this.targets.delete(targetId);
      return true;
    }
    return false;
  }

  /**
   * Get all active targets
   */
  getActiveTargets(): Target[] {
    return Array.from(this.targets.values()).filter(t => t.active);
  }

  /**
   * Get a specific target by ID
   */
  getTarget(targetId: string): Target | undefined {
    return this.targets.get(targetId);
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<TargetManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): TargetManagerConfig {
    return { ...this.config };
  }

  /**
   * Clear all targets
   */
  clearAllTargets(): void {
    this.targets.clear();
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.targets.clear();
    this.nextTargetId = 0;
    this.lastSpawnTime = 0;
  }
}
