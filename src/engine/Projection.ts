/**
 * Projection - Angular-to-screen-space projection with FOV-based math
 * Pure TypeScript, no framework dependencies
 */

import type { ScreenPosition, Target, ProjectedTarget, CameraState, EngineConfig } from './types';

export class Projection {
  private fov: number;
  private width: number;
  private height: number;
  private focalLength: number;

  constructor(config: Pick<EngineConfig, 'fov' | 'width' | 'height'>) {
    this.fov = config.fov;
    this.width = config.width;
    this.height = config.height;
    this.focalLength = this.calculateFocalLength();
  }

  /**
   * Calculate focal length from FOV
   * focalLength = (width/2) / tan(fov/2)
   */
  private calculateFocalLength(): number {
    const fovRadians = (this.fov * Math.PI) / 180;
    return (this.width / 2) / Math.tan(fovRadians / 2);
  }

  /**
   * Update dimensions (e.g., on canvas resize)
   */
  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.focalLength = this.calculateFocalLength();
  }

  /**
   * Update FOV
   */
  setFov(fov: number): void {
    this.fov = fov;
    this.focalLength = this.calculateFocalLength();
  }

  /**
   * Get current FOV
   */
  getFov(): number {
    return this.fov;
  }

  /**
   * Project a world-space angle (relative to camera) to screen coordinates
   * Input: yaw/pitch in degrees relative to camera center
   * Output: screen x/y in pixels from top-left
   */
  projectAngleToScreen(relativeYaw: number, relativePitch: number): ScreenPosition {
    const yawRad = (relativeYaw * Math.PI) / 180;
    const pitchRad = (relativePitch * Math.PI) / 180;

    // Convert spherical to Cartesian (looking down -Z axis)
    // x = sin(yaw) * cos(pitch)
    // y = sin(pitch)
    // z = -cos(yaw) * cos(pitch)
    const x = Math.sin(yawRad) * Math.cos(pitchRad);
    const y = Math.sin(pitchRad);
    const z = -Math.cos(yawRad) * Math.cos(pitchRad);

    // Check if point is behind camera
    if (z >= 0) {
      return { x: -1, y: -1, visible: false };
    }

    // Perspective projection
    const screenX = (x / -z) * this.focalLength + this.width / 2;
    const screenY = (-y / -z) * this.focalLength + this.height / 2;

    // Check if within screen bounds (with some margin for circles)
    const visible = screenX >= -100 && screenX <= this.width + 100 &&
                    screenY >= -100 && screenY <= this.height + 100;

    return { x: screenX, y: screenY, visible };
  }

  /**
   * Project an angular radius to screen-space radius
   * This approximates the radius at the center of the target
   */
  projectRadiusToScreen(angularRadiusDeg: number, distance: number = 1): number {
    // For small angles, the screen radius is approximately:
    // screenRadius = focalLength * tan(angularRadius)
    const angularRadiusRad = (angularRadiusDeg * Math.PI) / 180;
    return this.focalLength * Math.tan(angularRadiusRad);
  }

  /**
   * Project a target to screen coordinates
   * Takes target's world angles and camera state, returns screen position
   */
  projectTarget(target: Target, camera: CameraState): ProjectedTarget {
    // Calculate relative angles (target angle minus camera angle)
    const relativeYaw = target.yaw - camera.yaw;
    const relativePitch = target.pitch - camera.pitch;

    const screenPos = this.projectAngleToScreen(relativeYaw, relativePitch);
    const screenRadius = this.projectRadiusToScreen(target.radius);

    return {
      ...target,
      screenX: screenPos.x,
      screenY: screenPos.y,
      screenRadius,
      visible: screenPos.visible,
    };
  }

  /**
   * Convert screen coordinates to relative angles
   * Useful for determining where a click would be in angle-space
   */
  screenToAngle(screenX: number, screenY: number): { yaw: number; pitch: number } {
    const ndcX = (screenX - this.width / 2) / this.focalLength;
    const ndcY = -(screenY - this.height / 2) / this.focalLength;

    // Inverse projection: given x/z and y/z ratios, find angles
    // yaw = atan2(x, -z), pitch = asin(y / sqrt(x² + y² + z²))
    // Simplified for z = -1: yaw = atan(ndcX), pitch = atan(ndcY)
    const yawRad = Math.atan(ndcX);
    const pitchRad = Math.atan(ndcY);

    return {
      yaw: (yawRad * 180) / Math.PI,
      pitch: (pitchRad * 180) / Math.PI,
    };
  }
}
