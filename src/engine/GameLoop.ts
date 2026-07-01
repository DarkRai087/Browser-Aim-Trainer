/**
 * GameLoop - Main game loop tying all engine pieces together
 * Pure TypeScript, no framework dependencies
 * Runs at 60fps via requestAnimationFrame, completely outside React's render cycle
 */

import { Camera } from './Camera';
import { Projection } from './Projection';
import { TargetManager } from './TargetManager';
import type { TargetManagerConfig } from './TargetManager';
import { HitDetection } from './HitDetection';
import { DEFAULT_CONFIG } from './types';
import { DEFAULT_CROSSHAIR } from './crosshairTypes';
import type { CrosshairConfig } from './crosshairTypes';
import type {
  EngineConfig,
  SessionStats,
  GameState,
  OnStatsUpdateCallback,
  OnGameStateChangeCallback,
  ProjectedTarget,
} from './types';

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private camera: Camera;
  private projection: Projection;
  private targetManager: TargetManager;
  private hitDetection: HitDetection;
  
  private config: EngineConfig;
  private isRunning: boolean = false;
  private isPointerLocked: boolean = false;
  private animationFrameId: number | null = null;
  
  private stats: SessionStats;
  private sessionStartTime: number = 0;
  
  private onStatsUpdate: OnStatsUpdateCallback | null = null;
  private onGameStateChange: OnGameStateChangeCallback | null = null;
  
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandlePointerLockChange: () => void;

  private mouseX: number = 0;
  private mouseY: number = 0;
  
  private crosshairConfig: CrosshairConfig = DEFAULT_CROSSHAIR;

  constructor(canvas: HTMLCanvasElement, config: Partial<EngineConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize engine components
    this.camera = new Camera({
      sensitivity: this.config.sensitivity,
      dpi: this.config.dpi,
    });
    
    this.projection = new Projection({
      fov: this.config.fov,
      width: this.config.width,
      height: this.config.height,
    });
    
    this.targetManager = new TargetManager();
    this.hitDetection = new HitDetection(this.projection);
    
    // Initialize stats
    this.stats = this.createEmptyStats();
    
    // Bind event handlers
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): SessionStats {
    return {
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
    };
  }

  /**
   * Update stats calculations
   */
  private updateStats(): void {
    this.stats.accuracy =
      this.stats.totalShots > 0
        ? (this.stats.hits / this.stats.totalShots) * 100
        : 0;
    
    this.stats.averageReactionTime =
      this.stats.reactionTimes.length > 0
        ? this.stats.reactionTimes.reduce((a, b) => a + b, 0) /
          this.stats.reactionTimes.length
        : 0;
    
    this.stats.duration = Date.now() - this.stats.startedAt;
    
    // Simple score calculation: hits * 100 - (misses * 25) + speed bonus
    const speedBonus = this.stats.averageReactionTime > 0
      ? Math.max(0, 500 - this.stats.averageReactionTime) * this.stats.hits * 0.5
      : 0;
    this.stats.score = Math.max(0, this.stats.hits * 100 - this.stats.misses * 25 + speedBonus);
    
    this.onStatsUpdate?.(this.getStats());
  }

  /**
   * Handle mouse movement - track cursor position
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isRunning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  /**
   * Handle click (shooting)
   */
  private handleClick(e: MouseEvent): void {
    if (!this.isRunning) return;

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if click hit any target (screen-space)
    const targets = this.targetManager.getActiveTargets();
    let hitTarget: typeof targets[0] | null = null;
    
    for (const target of targets) {
      // Targets store screen position directly now
      const dx = clickX - target.yaw;  // yaw = screenX
      const dy = clickY - target.pitch; // pitch = screenY
      const distance = Math.sqrt(dx * dx + dy * dy);
      const screenRadius = target.radius; // radius = screen radius in pixels
      
      if (distance <= screenRadius) {
        hitTarget = target;
        break;
      }
    }

    this.stats.totalShots++;

    if (hitTarget) {
      this.stats.hits++;
      const reactionTime = Date.now() - hitTarget.spawnedAt;
      this.stats.reactionTimes.push(reactionTime);
      this.targetManager.despawnTarget(hitTarget.id);

      // Auto-stop when target count goal is reached
      const goal = this.config.targetCount;
      if (goal > 0 && this.stats.hits >= goal) {
        this.updateStats();
        this.stop();
        return;
      }
    } else {
      this.stats.misses++;
    }

    this.updateStats();
  }

  /**
   * Handle pointer lock state changes
   */
  private handlePointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
    this.notifyGameStateChange();
  }

  /**
   * Request pointer lock on canvas
   */
  private requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  /**
   * Main render loop
   */
  private render(): void {
    const { width, height } = this.config;
    
    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw grid for spatial reference
    this.drawGrid();
    
    // Get and render targets at their screen positions
    const targets = this.targetManager.getActiveTargets();
    
    for (const target of targets) {
      this.drawTargetAtPosition(target.yaw, target.pitch, target.radius);
    }
    
    // Draw crosshair at mouse position
    this.drawCrosshairAt(this.mouseX, this.mouseY);
  }

  /**
   * Draw background grid for spatial reference
   */
  private drawGrid(): void {
    const { width, height } = this.config;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    for (let x = 0; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw a target circle at a specific screen position
   */
  private drawTargetAtPosition(screenX: number, screenY: number, screenRadius: number): void {
    // Outer glow
    const gradient = this.ctx.createRadialGradient(
      screenX, screenY, screenRadius * 0.5,
      screenX, screenY, screenRadius * 1.5
    );
    gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, screenRadius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Main circle
    this.ctx.fillStyle = '#ff4444';
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner highlight
    this.ctx.fillStyle = '#ff6666';
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, screenRadius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Center dot
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, screenRadius * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a target circle (legacy method for ProjectedTarget)
   */
  private drawTarget(target: ProjectedTarget): void {
    this.drawTargetAtPosition(target.screenX, target.screenY, target.screenRadius);
  }

  /**
   * Draw crosshair at a specific position
   */
  private drawCrosshairAt(x: number, y: number): void {
    const cfg = this.crosshairConfig;
    const alpha = cfg.opacity / 100;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    const { size, gap, thickness, dot, dotSize, outline, outlineThickness, tStyle, style } = cfg;
    
    // Helper to draw a line with optional outline
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      if (outline) {
        this.ctx.strokeStyle = cfg.outlineColor;
        this.ctx.lineWidth = thickness + outlineThickness * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
      this.ctx.strokeStyle = cfg.color;
      this.ctx.lineWidth = thickness;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    };
    
    // Draw based on style
    if (style === 'circle') {
      // Circle style
      if (outline) {
        this.ctx.strokeStyle = cfg.outlineColor;
        this.ctx.lineWidth = thickness + outlineThickness * 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.strokeStyle = cfg.color;
      this.ctx.lineWidth = thickness;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (style === 'dot') {
      // Dot only - no lines
    } else {
      // Default/classic/cross styles - draw lines
      if (size > 0) {
        // Left line
        drawLine(x - size - gap, y, x - gap, y);
        // Right line
        drawLine(x + gap, y, x + size + gap, y);
        // Top line (unless T-style)
        if (!tStyle) {
          drawLine(x, y - size - gap, x, y - gap);
        }
        // Bottom line
        drawLine(x, y + gap, x, y + size + gap);
      }
    }
    
    // Center dot
    if (dot && dotSize > 0) {
      if (outline) {
        this.ctx.fillStyle = cfg.outlineColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, dotSize + outlineThickness, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.fillStyle = cfg.color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * Draw crosshair at center
   */
  private drawCrosshair(): void {
    this.drawCrosshairAt(this.config.width / 2, this.config.height / 2);
  }

  /**
   * Draw debug information
   */
  private drawDebugInfo(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Mouse: ${this.mouseX.toFixed(0)}, ${this.mouseY.toFixed(0)}`, 10, 20);
  }

  /**
   * Main game loop tick
   */
  private tick = (): void => {
    if (!this.isRunning) return;
    
    // Spawn targets as needed
    this.targetManager.spawnTarget();
    
    // Render
    this.render();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Notify listeners of game state change
   */
  private notifyGameStateChange(): void {
    this.onGameStateChange?.(this.getGameState());
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPointerLocked = true; // We don't use actual pointer lock anymore
    this.stats = this.createEmptyStats();
    this.stats.startedAt = Date.now();
    this.stats.targetCount = this.config.targetCount;
    this.sessionStartTime = Date.now();
    
    this.camera.reset();
    this.targetManager.reset();
    
    // Update target manager with current canvas size
    this.targetManager.updateConfig({
      canvasWidth: this.config.width,
      canvasHeight: this.config.height,
    });
    
    // Initialize mouse position to center
    this.mouseX = this.config.width / 2;
    this.mouseY = this.config.height / 2;
    
    // Add event listeners
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('click', this.boundHandleClick);
    
    // Hide cursor over canvas
    this.canvas.style.cursor = 'none';
    
    // Start the loop
    this.tick();
    this.notifyGameStateChange();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.isPointerLocked = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('click', this.boundHandleClick);
    
    // Restore cursor
    this.canvas.style.cursor = 'crosshair';
    
    this.updateStats();
    this.notifyGameStateChange();
  }

  /**
   * Pause the game (keeps state)
   */
  pause(): void {
    if (!this.isRunning) return;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (!this.isRunning) return;
    this.tick();
  }

  /**
   * Get current stats (creates a copy)
   */
  getStats(): SessionStats {
    return { ...this.stats };
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return {
      isRunning: this.isRunning,
      isPointerLocked: this.isPointerLocked,
      stats: this.getStats(),
      camera: this.camera.getState(),
    };
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.sensitivity !== undefined || config.dpi !== undefined) {
      this.camera.setSensitivity(config.sensitivity ?? this.config.sensitivity);
      this.camera.setDpi(config.dpi ?? this.config.dpi);
    }
    
    if (config.fov !== undefined) {
      this.projection.setFov(config.fov);
    }
    
    if (config.width !== undefined || config.height !== undefined) {
      this.projection.setDimensions(
        config.width ?? this.config.width,
        config.height ?? this.config.height
      );
    }
  }

  /**
   * Update target manager configuration
   */
  updateTargetConfig(config: Partial<TargetManagerConfig>): void {
    this.targetManager.updateConfig(config);
  }

  /**
   * Update crosshair configuration
   */
  setCrosshairConfig(config: CrosshairConfig): void {
    this.crosshairConfig = { ...config };
  }

  /**
   * Get current crosshair configuration
   */
  getCrosshairConfig(): CrosshairConfig {
    return { ...this.crosshairConfig };
  }

  /**
   * Set callbacks for state updates
   */
  setCallbacks(
    onStatsUpdate?: OnStatsUpdateCallback,
    onGameStateChange?: OnGameStateChangeCallback
  ): void {
    this.onStatsUpdate = onStatsUpdate ?? null;
    this.onGameStateChange = onGameStateChange ?? null;
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.projection.setDimensions(width, height);
    if (!this.isRunning) {
      this.renderIdle();
    }
  }

  /**
   * Render idle state (when game is not running)
   */
  renderIdle(): void {
    const { width, height } = this.config;
    
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);
    
    this.drawGrid();
    this.drawCrosshairAt(width / 2, height / 2);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
  }
}
