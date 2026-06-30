/**
 * Camera - Handles yaw/pitch state with CS-accurate sensitivity math
 * Pure TypeScript, no framework dependencies
 */

import type { CameraState, EngineConfig } from './types';

/**
 * CS:GO/Source engine m_yaw constant
 * This is the base conversion factor from mouse counts to degrees
 * degrees = movementCount * sensitivity * M_YAW
 */
const M_YAW = 0.022;

export class Camera {
  private yaw: number = 0;
  private pitch: number = 0;
  private sensitivity: number;
  private dpi: number;

  constructor(config: Pick<EngineConfig, 'sensitivity' | 'dpi'>) {
    this.sensitivity = config.sensitivity;
    this.dpi = config.dpi;
  }

  /**
   * Process raw mouse movement from Pointer Lock API
   * Uses CS-accurate sensitivity formula: degrees = movementCount * sensitivity * 0.022
   */
  handleMouseMove(movementX: number, movementY: number): void {
    const deltaYaw = movementX * this.sensitivity * M_YAW;
    const deltaPitch = movementY * this.sensitivity * M_YAW;

    this.yaw += deltaYaw;
    this.pitch -= deltaPitch; // Inverted: moving mouse up should look up (positive pitch)

    // Normalize yaw to [-180, 180] range
    while (this.yaw > 180) this.yaw -= 360;
    while (this.yaw < -180) this.yaw += 360;

    // Clamp pitch to [-89, 89] to prevent gimbal lock at poles
    this.pitch = Math.max(-89, Math.min(89, this.pitch));
  }

  /**
   * Get current camera state
   */
  getState(): CameraState {
    return {
      yaw: this.yaw,
      pitch: this.pitch,
    };
  }

  /**
   * Update sensitivity
   */
  setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity;
  }

  /**
   * Update DPI
   */
  setDpi(dpi: number): void {
    this.dpi = dpi;
  }

  /**
   * Get current sensitivity
   */
  getSensitivity(): number {
    return this.sensitivity;
  }

  /**
   * Get current DPI
   */
  getDpi(): number {
    return this.dpi;
  }

  /**
   * Calculate cm/360 based on current sensitivity and DPI
   * Formula: cm/360 = (360 / (sensitivity * M_YAW)) / DPI * 2.54
   */
  getCmPer360(): number {
    const countsPerDegree = 1 / (this.sensitivity * M_YAW);
    const countsFor360 = countsPerDegree * 360;
    const inchesPer360 = countsFor360 / this.dpi;
    const cmPer360 = inchesPer360 * 2.54;
    return cmPer360;
  }

  /**
   * Set sensitivity to achieve a specific cm/360
   * Inverse of getCmPer360
   */
  setSensitivityFromCmPer360(cmPer360: number): void {
    const inchesPer360 = cmPer360 / 2.54;
    const countsFor360 = inchesPer360 * this.dpi;
    const countsPerDegree = countsFor360 / 360;
    this.sensitivity = 1 / (countsPerDegree * M_YAW);
  }

  /**
   * Reset camera to center
   */
  reset(): void {
    this.yaw = 0;
    this.pitch = 0;
  }
}
