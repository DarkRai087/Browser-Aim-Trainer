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
import { SPRAY_PATTERNS } from './sprayPatterns';
import type { CrosshairConfig } from './crosshairTypes';
import type { SprayPattern, SprayPoint } from './sprayPatterns';
import type { GameModeType } from './gameModes';
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

  // Game mode
  private gameMode: GameModeType = 'flick';
  
  // Spray training state
  private sprayPattern: SprayPattern | null = null;
  private sprayStartTime: number = 0;
  private sprayBulletIndex: number = 0;
  private isSprayActive: boolean = false;
  private sprayScore: number = 0;
  private sprayAccuracyHistory: number[] = [];
  private playerSprayPath: { x: number; y: number; time: number }[] = [];
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

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
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
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

  // Track bullet impacts for visualization
  private bulletImpacts: { x: number; y: number; hit: boolean; time: number }[] = [];
  private lastBulletTime: number = 0;
  private isMouseDown: boolean = false;
  private mouseDownTime: number = 0;

  /**
   * Handle mouse down (for spray mode)
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.isRunning || this.gameMode !== 'spray') return;

    this.isMouseDown = true;
    this.mouseDownTime = Date.now();

    if (!this.sprayPattern) return;

    // Reset if pattern was completed
    if (this.isSprayActive && this.sprayBulletIndex >= this.sprayPattern.bullets) {
      this.resetSpray();
      return;
    }

    // Start spray if not active
    if (!this.isSprayActive) {
      this.startSpray();
    }

    // Fire ONE bullet immediately on click
    this.fireBullet();
  }

  /**
   * Handle mouse up (for spray mode)
   */
  private handleMouseUp(e: MouseEvent): void {
    this.isMouseDown = false;
    // Don't end spray on mouse up - let user tap or spray
    // Spray ends when pattern completes or user clicks reset
  }

  /**
   * Fire a single bullet
   */
  private fireBullet(): void {
    if (!this.sprayPattern || this.sprayBulletIndex >= this.sprayPattern.bullets) {
      return;
    }
    
    const now = Date.now();
    const fireRate = this.sprayPattern.fireRate;
    
    // Enforce fire rate
    if (now - this.lastBulletTime < fireRate * 0.8) {
      return;
    }
    
    this.lastBulletTime = now;
    const elapsedTime = now - this.sprayStartTime;
    
    // Get recoil for current bullet
    const bulletIndex = this.sprayBulletIndex;
    const recoilPoint = this.sprayPattern.pattern[bulletIndex];
    
    if (!recoilPoint) return;
    
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    
    // Record player crosshair position
    this.playerSprayPath.push({
      x: this.mouseX,
      y: this.mouseY,
      time: elapsedTime,
    });
    
    // Bullet lands at: where you click/aim + recoil offset
    // Recoil pushes bullets away from where you're aiming
    const bulletX = this.mouseX + recoilPoint.x;
    const bulletY = this.mouseY + recoilPoint.y;
    
    // Check if bullet hit the center target zone
    const distFromCenter = Math.sqrt(
      Math.pow(bulletX - centerX, 2) + Math.pow(bulletY - centerY, 2)
    );
    const isHit = distFromCenter < 50; // 50px tolerance for center target
    
    // Record impact
    this.bulletImpacts.push({
      x: bulletX,
      y: bulletY,
      hit: isHit,
      time: now,
    });
    
    // Update stats
    this.stats.totalShots++;
    if (isHit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    
    // Advance to next bullet
    this.sprayBulletIndex++;
    
    // Update accuracy
    this.stats.accuracy = this.stats.totalShots > 0 
      ? (this.stats.hits / this.stats.totalShots) * 100 
      : 0;
    this.stats.score = Math.round(this.stats.accuracy * this.sprayBulletIndex / 3);
    
    this.updateStats();
    
    // Check if spray is complete
    if (this.sprayBulletIndex >= this.sprayPattern.bullets) {
      this.endSpray();
    }
  }

  /**
   * Start spray sequence
   */
  private startSpray(): void {
    this.isSprayActive = true;
    this.sprayStartTime = Date.now();
    this.sprayBulletIndex = 0;
    this.playerSprayPath = [];
    this.bulletImpacts = [];
    this.lastBulletTime = 0;
    this.sprayScore = 0;
    
    // Reset stats for new spray
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalShots = 0;
    this.stats.accuracy = 0;
    this.stats.score = 0;
  }

  /**
   * End spray sequence and calculate score
   */
  private endSpray(): void {
    // Keep isSprayActive true so player can see results and click to reset
    // Pattern is complete when all bullets fired
    if (this.sprayBulletIndex >= (this.sprayPattern?.bullets || 0)) {
      this.sprayScore = this.stats.accuracy;
      this.sprayAccuracyHistory.push(this.sprayScore);
    }
    
    this.isMouseDown = false;
  }

  /**
   * Calculate how accurately the player followed the spray pattern
   */
  private calculateSprayAccuracy(): number {
    if (!this.sprayPattern || this.playerSprayPath.length < 2) return 0;
    
    let totalDeviation = 0;
    let samples = 0;
    
    for (const playerPoint of this.playerSprayPath) {
      // Find the expected pattern point at this time
      const expectedPoint = this.getExpectedSprayPoint(playerPoint.time);
      if (!expectedPoint) continue;
      
      // Player needs to move OPPOSITE to the recoil
      // So if pattern goes down (positive y), player should go down (positive y on screen)
      const expectedX = -expectedPoint.x; // Opposite direction
      const expectedY = -expectedPoint.y; // Opposite direction
      
      const dx = playerPoint.x - expectedX;
      const dy = playerPoint.y - expectedY;
      const deviation = Math.sqrt(dx * dx + dy * dy);
      
      totalDeviation += deviation;
      samples++;
    }
    
    if (samples === 0) return 0;
    
    const avgDeviation = totalDeviation / samples;
    // Convert deviation to accuracy (0-100%)
    // 0 deviation = 100%, 50+ pixels deviation = 0%
    const accuracy = Math.max(0, Math.min(100, 100 - (avgDeviation * 2)));
    return accuracy;
  }

  /**
   * Get expected spray pattern point at a given time
   */
  private getExpectedSprayPoint(time: number): SprayPoint | null {
    if (!this.sprayPattern) return null;
    
    const pattern = this.sprayPattern.pattern;
    
    // Find the two points to interpolate between
    for (let i = 0; i < pattern.length - 1; i++) {
      if (time >= pattern[i].time && time <= pattern[i + 1].time) {
        const t = (time - pattern[i].time) / (pattern[i + 1].time - pattern[i].time);
        return {
          x: pattern[i].x + (pattern[i + 1].x - pattern[i].x) * t,
          y: pattern[i].y + (pattern[i + 1].y - pattern[i].y) * t,
          time: time,
        };
      }
    }
    
    // Return last point if time exceeds pattern
    return pattern[pattern.length - 1];
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

    if (this.gameMode === 'spray') {
      this.renderSprayMode();
    } else {
      // Flick mode - render targets
      const targets = this.targetManager.getActiveTargets();
      for (const target of targets) {
        this.drawTargetAtPosition(target.yaw, target.pitch, target.radius);
      }
      // Draw crosshair at mouse position
      this.drawCrosshairAt(this.mouseX, this.mouseY);
    }
  }

  /**
   * Render spray pattern training mode
   */
  private renderSprayMode(): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;

    if (!this.sprayPattern) return;

    // Draw target zone at center (where bullets should hit)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Center dot
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    this.ctx.fillStyle = '#00ff88';
    this.ctx.fill();

    // Draw bullet impacts (they stay visible)
    for (const impact of this.bulletImpacts) {
      // Impact hole
      this.ctx.beginPath();
      this.ctx.arc(impact.x, impact.y, impact.hit ? 5 : 4, 0, Math.PI * 2);
      this.ctx.fillStyle = impact.hit ? '#00ff88' : '#ff4444';
      this.ctx.fill();
      
      // Outer ring
      this.ctx.beginPath();
      this.ctx.arc(impact.x, impact.y, impact.hit ? 8 : 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = impact.hit ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 68, 68, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Show where next bullet will land (preview) based on current aim
    if (this.sprayBulletIndex < this.sprayPattern.bullets) {
      const nextRecoil = this.sprayPattern.pattern[this.sprayBulletIndex];
      if (nextRecoil) {
        // Predicted impact position = crosshair + recoil
        const predictedX = this.mouseX + nextRecoil.x;
        const predictedY = this.mouseY + nextRecoil.y;
        
        // Draw predicted impact (ghost circle)
        this.ctx.beginPath();
        this.ctx.arc(predictedX, predictedY, 10, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // X marker at predicted impact
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(predictedX - 4, predictedY - 4);
        this.ctx.lineTo(predictedX + 4, predictedY + 4);
        this.ctx.moveTo(predictedX + 4, predictedY - 4);
        this.ctx.lineTo(predictedX - 4, predictedY + 4);
        this.ctx.stroke();
      }
    }

    // Draw reference pattern in corner
    this.drawSprayPattern(centerX, centerY);

    // Draw crosshair at mouse position
    this.drawCrosshairAt(this.mouseX, this.mouseY);

    // Draw spray info
    this.drawSprayInfo();
  }

  /**
   * Draw the spray pattern reference (small, in corner)
   */
  private drawSprayPattern(centerX: number, centerY: number): void {
    if (!this.sprayPattern) return;

    const pattern = this.sprayPattern.pattern;
    
    // Box position and size
    const boxX = 10;
    const boxY = this.config.height - 170;
    const boxW = 140;
    const boxH = 160;
    
    // Pattern origin (near bottom of box, pattern goes UP from here)
    const refX = boxX + boxW / 2;
    const refY = boxY + boxH - 25; // Start near bottom
    const scale = 0.3; // Scale down the pattern
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    
    // Label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '11px monospace';
    this.ctx.fillText('Recoil Pattern', boxX + 10, boxY + 18);
    
    // Draw pattern line (Y is negative in pattern, so adding it moves UP on screen)
    this.ctx.beginPath();
    this.ctx.moveTo(refX + pattern[0].x * scale, refY + pattern[0].y * scale);
    
    for (let i = 1; i < pattern.length; i++) {
      this.ctx.lineTo(refX + pattern[i].x * scale, refY + pattern[i].y * scale);
    }
    
    this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Draw bullet dots
    for (let i = 0; i < pattern.length; i++) {
      const point = pattern[i];
      const isFired = i < this.sprayBulletIndex;
      
      this.ctx.beginPath();
      this.ctx.arc(refX + point.x * scale, refY + point.y * scale, isFired ? 3 : 2, 0, Math.PI * 2);
      this.ctx.fillStyle = isFired ? '#ff6666' : 'rgba(255, 100, 100, 0.4)';
      this.ctx.fill();
    }
    
    // Show current bullet indicator
    if (this.sprayBulletIndex < pattern.length) {
      const currentPoint = pattern[this.sprayBulletIndex];
      this.ctx.beginPath();
      this.ctx.arc(refX + currentPoint.x * scale, refY + currentPoint.y * scale, 5, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#ffff00';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  /**
   * Draw spray mode info overlay
   */
  private drawSprayInfo(): void {
    const { width } = this.config;
    
    // Stats panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(width - 220, 10, 210, 130);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(`${this.sprayPattern?.name || 'Weapon'}`, width - 210, 32);
    
    this.ctx.font = '13px monospace';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText(`Bullets: ${this.sprayBulletIndex}/${this.sprayPattern?.bullets || 0}`, width - 210, 55);
    
    // Accuracy with color coding
    const accuracy = this.stats.accuracy;
    this.ctx.fillStyle = accuracy >= 70 ? '#00ff88' : accuracy >= 40 ? '#ffaa00' : '#ff4444';
    this.ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, width - 210, 75);
    
    this.ctx.fillStyle = '#00ff88';
    this.ctx.fillText(`Hits: ${this.stats.hits}`, width - 210, 95);
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillText(`Miss: ${this.stats.misses}`, width - 110, 95);
    
    // Instructions
    this.ctx.font = '11px monospace';
    if (!this.isSprayActive) {
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillText('Click to tap / Hold to spray', width - 210, 120);
    } else if (this.sprayBulletIndex >= (this.sprayPattern?.bullets || 0)) {
      this.ctx.fillStyle = '#ff9500';
      this.ctx.fillText('Pattern complete! Click to reset', width - 210, 120);
    } else {
      this.ctx.fillStyle = this.isMouseDown ? '#ff9500' : '#00ff88';
      this.ctx.fillText(this.isMouseDown ? 'Spraying...' : 'Click/Hold to continue', width - 210, 120);
    }

    // Instructions panel
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('Pull crosshair DOWN to control recoil • White circle = bullet landing spot • Hit green target!', 
      this.config.width / 2 - 220, this.config.height - 20);
  }
  
  /**
   * Reset spray for another attempt
   */
  resetSpray(): void {
    this.isSprayActive = false;
    this.sprayBulletIndex = 0;
    this.bulletImpacts = [];
    this.playerSprayPath = [];
    this.sprayScore = 0;
    this.isMouseDown = false;
    this.lastBulletTime = 0;
    
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalShots = 0;
    this.stats.accuracy = 0;
    this.stats.score = 0;
    this.updateStats();
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

    if (this.gameMode === 'spray') {
      // Auto-fire when HOLDING mouse button (not just clicking)
      // Only start continuous fire after 150ms hold to allow single taps
      const holdTime = Date.now() - this.mouseDownTime;
      if (this.isMouseDown && this.isSprayActive && holdTime > 150) {
        this.fireBullet();
      }
    } else {
      // Spawn targets as needed for flick mode
      this.targetManager.spawnTarget();
    }

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
    this.sessionStartTime = Date.now();
    
    this.camera.reset();
    this.targetManager.reset();
    
    // Reset spray state
    this.isSprayActive = false;
    this.sprayBulletIndex = 0;
    this.sprayScore = 0;
    this.sprayAccuracyHistory = [];
    this.playerSprayPath = [];
    
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
    
    if (this.gameMode === 'spray') {
      this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
      this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    } else {
      this.canvas.addEventListener('click', this.boundHandleClick);
    }
    
    // Hide cursor over canvas
    this.canvas.style.cursor = 'none';
    
    // Start the loop
    this.tick();
    this.notifyGameStateChange();
  }

  /**
   * Set game mode
   */
  setGameMode(mode: GameModeType): void {
    this.gameMode = mode;
  }

  /**
   * Set spray pattern by weapon ID
   */
  setSprayPattern(weaponId: string): void {
    this.sprayPattern = SPRAY_PATTERNS[weaponId] || null;
  }

  /**
   * Get current game mode
   */
  getGameMode(): GameModeType {
    return this.gameMode;
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.isPointerLocked = false;
    this.isSprayActive = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('click', this.boundHandleClick);
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    
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
