/**
 * CS2 Weapon Spray Patterns
 * Coordinates represent the recoil offset from center for each bullet
 * Values are in screen pixels (scaled for training)
 */

export type SprayPoint = {
  x: number;  // Horizontal offset
  y: number;  // Vertical offset (negative = up, like real CS2 recoil)
  time: number; // Time in ms from start
};

export type SprayPattern = {
  name: string;
  weapon: string;
  bullets: number;
  fireRate: number; // ms between shots
  pattern: SprayPoint[];
};

/**
 * AK-47 spray pattern from CS2
 * 30 bullets, ~100ms between shots
 * Recoil goes UP (negative Y), player must pull DOWN to compensate
 * Pattern: Up → Up-Left → Up-Right → Left → Right
 */
export const AK47_PATTERN: SprayPattern = {
  name: 'AK-47',
  weapon: 'ak47',
  bullets: 30,
  fireRate: 100,
  pattern: [
    // First 10 bullets - recoil goes UP, pull crosshair DOWN
    { x: 0, y: 0, time: 0 },
    { x: 2, y: -15, time: 100 },
    { x: 3, y: -35, time: 200 },
    { x: 1, y: -58, time: 300 },
    { x: -2, y: -82, time: 400 },
    { x: -4, y: -105, time: 500 },
    { x: -3, y: -125, time: 600 },
    { x: 0, y: -142, time: 700 },
    { x: 4, y: -158, time: 800 },
    { x: 8, y: -172, time: 900 },
    // Bullets 11-15 - move left
    { x: -5, y: -185, time: 1000 },
    { x: -18, y: -195, time: 1100 },
    { x: -32, y: -203, time: 1200 },
    { x: -45, y: -210, time: 1300 },
    { x: -55, y: -215, time: 1400 },
    // Bullets 16-20 - move right
    { x: -50, y: -220, time: 1500 },
    { x: -35, y: -225, time: 1600 },
    { x: -15, y: -230, time: 1700 },
    { x: 8, y: -235, time: 1800 },
    { x: 30, y: -238, time: 1900 },
    // Bullets 21-25 - move left again
    { x: 48, y: -240, time: 2000 },
    { x: 40, y: -242, time: 2100 },
    { x: 25, y: -244, time: 2200 },
    { x: 5, y: -246, time: 2300 },
    { x: -15, y: -248, time: 2400 },
    // Bullets 26-30 - slight right
    { x: -30, y: -250, time: 2500 },
    { x: -20, y: -252, time: 2600 },
    { x: -5, y: -254, time: 2700 },
    { x: 10, y: -256, time: 2800 },
    { x: 20, y: -258, time: 2900 },
  ],
};

/**
 * M4A4 spray pattern from CS2
 * Recoil goes UP (negative Y), player must pull DOWN to compensate
 */
export const M4A4_PATTERN: SprayPattern = {
  name: 'M4A4',
  weapon: 'm4a4',
  bullets: 30,
  fireRate: 90,
  pattern: [
    { x: 0, y: 0, time: 0 },
    { x: 1, y: -12, time: 90 },
    { x: 2, y: -28, time: 180 },
    { x: 0, y: -45, time: 270 },
    { x: -2, y: -62, time: 360 },
    { x: -3, y: -78, time: 450 },
    { x: -1, y: -92, time: 540 },
    { x: 2, y: -105, time: 630 },
    { x: 6, y: -116, time: 720 },
    { x: 10, y: -126, time: 810 },
    { x: 5, y: -135, time: 900 },
    { x: -5, y: -143, time: 990 },
    { x: -18, y: -150, time: 1080 },
    { x: -30, y: -156, time: 1170 },
    { x: -38, y: -161, time: 1260 },
    { x: -35, y: -165, time: 1350 },
    { x: -25, y: -169, time: 1440 },
    { x: -10, y: -173, time: 1530 },
    { x: 8, y: -176, time: 1620 },
    { x: 25, y: -179, time: 1710 },
    { x: 38, y: -181, time: 1800 },
    { x: 32, y: -183, time: 1890 },
    { x: 20, y: -185, time: 1980 },
    { x: 5, y: -187, time: 2070 },
    { x: -10, y: -189, time: 2160 },
    { x: -22, y: -191, time: 2250 },
    { x: -15, y: -193, time: 2340 },
    { x: -5, y: -195, time: 2430 },
    { x: 5, y: -197, time: 2520 },
    { x: 12, y: -199, time: 2610 },
  ],
};

export const SPRAY_PATTERNS: Record<string, SprayPattern> = {
  ak47: AK47_PATTERN,
  m4a4: M4A4_PATTERN,
};

export const PATTERN_LIST = [
  { id: 'ak47', name: 'AK-47', icon: '🔫' },
  { id: 'm4a4', name: 'M4A4', icon: '🔫' },
];
