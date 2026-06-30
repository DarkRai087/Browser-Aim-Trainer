/**
 * HitDetection - Click-to-hit logic
 * Pure TypeScript, no framework dependencies
 */

import type { Target, HitResult, CameraState, ProjectedTarget } from './types';
import { Projection } from './Projection';

export class HitDetection {
  private projection: Projection;

  constructor(projection: Projection) {
    this.projection = projection;
  }

  /**
   * Check if a click at screen coordinates hits any target
   * Returns hit result with target info and reaction time
   */
  checkHit(
    screenX: number,
    screenY: number,
    targets: Target[],
    camera: CameraState,
    currentTime: number = Date.now()
  ): HitResult {
    // Project all targets to screen space
    const projectedTargets = targets
      .filter(t => t.active)
      .map(t => this.projection.projectTarget(t, camera))
      .filter(t => t.visible);

    // Check each target for hit (front to back, closest first)
    // Sort by distance to click point for tie-breaking
    projectedTargets.sort((a, b) => {
      const distA = Math.hypot(screenX - a.screenX, screenY - a.screenY);
      const distB = Math.hypot(screenX - b.screenX, screenY - b.screenY);
      return distA - distB;
    });

    for (const projTarget of projectedTargets) {
      const distance = Math.hypot(
        screenX - projTarget.screenX,
        screenY - projTarget.screenY
      );

      if (distance <= projTarget.screenRadius) {
        return {
          hit: true,
          target: projTarget,
          reactionTime: currentTime - projTarget.spawnedAt,
        };
      }
    }

    return {
      hit: false,
      target: null,
      reactionTime: null,
    };
  }

  /**
   * Check hit using angular distance (more accurate for 3D space)
   * This method works directly in angle-space rather than screen-space
   */
  checkHitAngular(
    camera: CameraState,
    targets: Target[],
    currentTime: number = Date.now()
  ): HitResult {
    // In this mode, we check if the camera is pointing at a target
    // (i.e., the target's angular distance from camera center is less than its radius)
    
    for (const target of targets.filter(t => t.active)) {
      const angularDistance = this.calculateAngularDistance(
        camera.yaw,
        camera.pitch,
        target.yaw,
        target.pitch
      );

      if (angularDistance <= target.radius) {
        return {
          hit: true,
          target,
          reactionTime: currentTime - target.spawnedAt,
        };
      }
    }

    return {
      hit: false,
      target: null,
      reactionTime: null,
    };
  }

  /**
   * Calculate angular distance between two points in spherical coordinates
   * Uses the haversine formula adapted for small angles
   */
  private calculateAngularDistance(
    yaw1: number,
    pitch1: number,
    yaw2: number,
    pitch2: number
  ): number {
    // Convert to radians
    const y1 = (yaw1 * Math.PI) / 180;
    const p1 = (pitch1 * Math.PI) / 180;
    const y2 = (yaw2 * Math.PI) / 180;
    const p2 = (pitch2 * Math.PI) / 180;

    // Spherical law of cosines
    const cosAngle =
      Math.sin(p1) * Math.sin(p2) +
      Math.cos(p1) * Math.cos(p2) * Math.cos(y2 - y1);

    // Clamp to [-1, 1] to handle floating point errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const angleRad = Math.acos(clampedCos);

    return (angleRad * 180) / Math.PI;
  }

  /**
   * Get all targets that are currently visible on screen
   */
  getVisibleTargets(targets: Target[], camera: CameraState): ProjectedTarget[] {
    return targets
      .filter(t => t.active)
      .map(t => this.projection.projectTarget(t, camera))
      .filter(t => t.visible);
  }
}
