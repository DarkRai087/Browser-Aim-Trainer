/**
 * Crosshair configuration types - CS2-style customization
 */

export type CrosshairStyle = 'default' | 'classic' | 'dot' | 'circle' | 'cross';

export type CrosshairConfig = {
  /** Crosshair style preset */
  style: CrosshairStyle;
  /** Main color (hex) */
  color: string;
  /** Outline color (hex) */
  outlineColor: string;
  /** Size of crosshair lines */
  size: number;
  /** Gap between center and lines */
  gap: number;
  /** Thickness of lines */
  thickness: number;
  /** Show center dot */
  dot: boolean;
  /** Dot size (if enabled) */
  dotSize: number;
  /** Show outline */
  outline: boolean;
  /** Outline thickness */
  outlineThickness: number;
  /** Opacity (0-100) */
  opacity: number;
  /** T-style (no top line) */
  tStyle: boolean;
};

export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  style: 'default',
  color: '#00ff00',
  outlineColor: '#000000',
  size: 12,
  gap: 5,
  thickness: 2,
  dot: true,
  dotSize: 2,
  outline: true,
  outlineThickness: 1,
  opacity: 100,
  tStyle: false,
};

/**
 * Encode crosshair config to shareable code
 * Format: CSGO-like string that's short and shareable
 */
export function encodeCrosshair(config: CrosshairConfig): string {
  const data = {
    s: config.style.charAt(0), // style first char
    c: config.color,
    oc: config.outlineColor,
    sz: config.size,
    g: config.gap,
    t: config.thickness,
    d: config.dot ? 1 : 0,
    ds: config.dotSize,
    o: config.outline ? 1 : 0,
    ot: config.outlineThickness,
    op: config.opacity,
    ts: config.tStyle ? 1 : 0,
  };
  
  // Encode to base64
  const json = JSON.stringify(data);
  const base64 = btoa(json);
  return `AIM-${base64}`;
}

/**
 * Decode crosshair code to config
 * Supports both our AIM- format and CS2 CSGO- format
 */
export function decodeCrosshair(code: string): CrosshairConfig | null {
  const trimmed = code.trim();
  
  // Try CS2/CSGO format first
  if (trimmed.startsWith('CSGO-')) {
    return decodeCS2Crosshair(trimmed);
  }
  
  // Try our AIM format
  if (trimmed.startsWith('AIM-')) {
    try {
      const base64 = trimmed.slice(4);
      const json = atob(base64);
      const data = JSON.parse(json);
      
      const styleMap: Record<string, CrosshairStyle> = {
        'd': 'default',
        'c': 'classic',
        'o': 'dot',
        'i': 'circle',
        'r': 'cross',
      };
      
      return {
        style: styleMap[data.s] || 'default',
        color: data.c || DEFAULT_CROSSHAIR.color,
        outlineColor: data.oc || DEFAULT_CROSSHAIR.outlineColor,
        size: data.sz ?? DEFAULT_CROSSHAIR.size,
        gap: data.g ?? DEFAULT_CROSSHAIR.gap,
        thickness: data.t ?? DEFAULT_CROSSHAIR.thickness,
        dot: data.d === 1,
        dotSize: data.ds ?? DEFAULT_CROSSHAIR.dotSize,
        outline: data.o === 1,
        outlineThickness: data.ot ?? DEFAULT_CROSSHAIR.outlineThickness,
        opacity: data.op ?? DEFAULT_CROSSHAIR.opacity,
        tStyle: data.ts === 1,
      };
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * CS2/CSGO share code character set
 * This is the exact character set used by CS2
 */
const CSGO_DICT = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';

/**
 * Decode CS2/CSGO crosshair share code
 * Format: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
 * 
 * Based on CS2's crosshair encoding format
 */
function decodeCS2Crosshair(code: string): CrosshairConfig | null {
  try {
    // Remove "CSGO-" prefix and dashes
    const cleanCode = code.replace('CSGO-', '').replace(/-/g, '');
    
    if (cleanCode.length !== 25) {
      return null;
    }
    
    // Decode from base-57 to bytes
    const bytes: number[] = [];
    let value = BigInt(0);
    
    for (const char of cleanCode) {
      const idx = CSGO_DICT.indexOf(char);
      if (idx === -1) return null;
      value = value * BigInt(57) + BigInt(idx);
    }
    
    // Convert BigInt to bytes (18 bytes total)
    for (let i = 0; i < 18; i++) {
      bytes.unshift(Number(value & BigInt(0xFF)));
      value = value >> BigInt(8);
    }
    
    // Parse crosshair data from bytes
    // Byte layout (approximate based on CS2 analysis):
    // [0]: identifier/version
    // [1]: style + flags
    // [2-3]: size (fixed point)
    // [4-5]: gap (fixed point, signed)
    // [6]: thickness
    // [7]: outline thickness
    // [8]: dot size
    // [9]: red
    // [10]: green
    // [11]: blue
    // [12]: alpha
    // [13]: flags (t-style, dot, outline, etc.)
    
    const flags1 = bytes[1] || 0;
    const style = flags1 & 0x07;
    
    // Size: bytes[2] as fixed point
    const rawSize = bytes[2] || 0;
    const size = rawSize / 10;
    
    // Gap: bytes[3-4] as signed fixed point
    const rawGap = bytes[3] || 0;
    const gapSign = (bytes[4] || 0) & 0x80 ? -1 : 1;
    const gap = gapSign * (rawGap / 10);
    
    // Thickness
    const thickness = (bytes[5] || 0) / 10;
    
    // Outline thickness
    const outlineThickness = (bytes[6] || 0) / 10;
    
    // Dot size
    const dotSize = (bytes[7] || 0) / 10;
    
    // Colors
    const red = bytes[8] || 0;
    const green = bytes[9] || 255;
    const blue = bytes[10] || 0;
    const alpha = bytes[11] || 255;
    
    // Flags
    const flags2 = bytes[12] || 0;
    const hasDot = (flags2 & 0x01) !== 0;
    const hasOutline = (flags2 & 0x02) !== 0;
    const tStyle = (flags2 & 0x04) !== 0;
    
    // Convert to hex color
    const color = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    
    // Map CS2 style (4 = classic static, 5 = classic dynamic)
    const styleMap: Record<number, CrosshairStyle> = {
      0: 'default',
      1: 'default', 
      2: 'classic',
      3: 'classic',
      4: 'classic', // Classic Static
      5: 'classic', // Classic Dynamic
    };
    
    // Convert CS2 values to our format
    // CS2 size 1 ≈ our size 4-6 pixels
    // CS2 gap -4 = lines touch/overlap at center (our gap 0-2)
    const convertedSize = Math.max(1, Math.round(size * 5));
    const convertedGap = Math.max(0, Math.round((gap + 5) * 2));
    const convertedThickness = Math.max(1, Math.round(thickness * 3) || 2);
    
    return {
      style: styleMap[style] || 'classic',
      color: color,
      outlineColor: '#000000',
      size: Math.min(30, convertedSize),
      gap: Math.min(20, convertedGap),
      thickness: Math.min(10, convertedThickness),
      dot: hasDot,
      dotSize: Math.max(1, Math.round(dotSize * 3) || 2),
      outline: hasOutline,
      outlineThickness: Math.max(1, Math.round(outlineThickness) || 1),
      opacity: Math.round((alpha / 255) * 100),
      tStyle: tStyle,
    };
  } catch (e) {
    console.warn('Failed to decode CS2 crosshair:', e);
    return null;
  }
}

/**
 * Check if a code is a valid CS2/CSGO share code format
 */
export function isCS2Code(code: string): boolean {
  return /^CSGO-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/.test(code.trim());
}

/**
 * CS2 manual settings interface
 * These are the settings shown in CS2's crosshair panel
 */
export type CS2CrosshairSettings = {
  style: 'default' | 'default_static' | 'classic' | 'classic_static' | 'classic_dynamic';
  length: number;      // cl_crosshairsize (0.5 - 10)
  thickness: number;   // cl_crosshairthickness (0 - 6)
  gap: number;         // cl_crosshairgap (-5 to 5)
  outline: boolean;    // cl_crosshair_drawoutline
  outlineThickness: number; // cl_crosshair_outlinethickness (0-3)
  dot: boolean;        // cl_crosshairdot
  tStyle: boolean;     // cl_crosshair_t
  color: 'green' | 'yellow' | 'blue' | 'cyan' | 'custom';
  red: number;         // cl_crosshaircolor_r (0-255)
  green: number;       // cl_crosshaircolor_g (0-255)
  blue: number;        // cl_crosshaircolor_b (0-255)
  alpha: number;       // cl_crosshairalpha (0-255)
};

/**
 * Convert CS2 manual settings to our CrosshairConfig
 */
export function cs2SettingsToConfig(cs2: CS2CrosshairSettings): CrosshairConfig {
  // Map CS2 style to our style
  let style: CrosshairStyle = 'default';
  if (cs2.style.includes('classic')) {
    style = 'classic';
  }
  
  // Convert CS2 color preset or custom RGB
  let color: string;
  if (cs2.color === 'green') {
    color = '#00ff00';
  } else if (cs2.color === 'yellow') {
    color = '#ffff00';
  } else if (cs2.color === 'blue') {
    color = '#0000ff';
  } else if (cs2.color === 'cyan') {
    color = '#00ffff';
  } else {
    color = `#${cs2.red.toString(16).padStart(2, '0')}${cs2.green.toString(16).padStart(2, '0')}${cs2.blue.toString(16).padStart(2, '0')}`;
  }
  
  // Convert CS2 values to our pixel-based values
  // CS2 length 1 ≈ 5 pixels in our system
  const size = Math.max(1, Math.round(cs2.length * 5));
  
  // CS2 gap can be negative (lines cross center)
  // We map -5 to 5 → 0 to 20 in our system
  const gap = Math.max(0, Math.round((cs2.gap + 5) * 2));
  
  // CS2 thickness 0 = very thin, we use minimum 1
  const thickness = Math.max(1, Math.round(cs2.thickness * 2) || 1);
  
  return {
    style,
    color,
    outlineColor: '#000000',
    size: Math.min(30, size),
    gap: Math.min(20, gap),
    thickness: Math.min(10, thickness),
    dot: cs2.dot,
    dotSize: 2,
    outline: cs2.outline,
    outlineThickness: Math.max(1, Math.round(cs2.outlineThickness) || 1),
    opacity: Math.round((cs2.alpha / 255) * 100),
    tStyle: cs2.tStyle,
  };
}

/**
 * Default CS2 settings matching the user's example
 */
export const DEFAULT_CS2_SETTINGS: CS2CrosshairSettings = {
  style: 'classic_static',
  length: 1,
  thickness: 0,
  gap: -4,
  outline: false,
  outlineThickness: 1,
  dot: false,
  tStyle: false,
  color: 'green',
  red: 0,
  green: 255,
  blue: 0,
  alpha: 255,
};

/**
 * Crosshair presets like CS2
 */
export const CROSSHAIR_PRESETS: Record<string, CrosshairConfig> = {
  'Default': DEFAULT_CROSSHAIR,
  'Classic': {
    ...DEFAULT_CROSSHAIR,
    style: 'classic',
    color: '#00ff00',
    size: 5,
    gap: 2,
    thickness: 1,
    dot: false,
  },
  'Small Dot': {
    ...DEFAULT_CROSSHAIR,
    style: 'dot',
    color: '#00ffff',
    dot: true,
    dotSize: 3,
    size: 0,
  },
  'Circle': {
    ...DEFAULT_CROSSHAIR,
    style: 'circle',
    color: '#ff00ff',
    size: 10,
    thickness: 2,
    dot: true,
    dotSize: 1,
  },
  'Pro': {
    ...DEFAULT_CROSSHAIR,
    style: 'default',
    color: '#00ff00',
    size: 4,
    gap: 3,
    thickness: 1,
    dot: false,
    outline: true,
    outlineThickness: 1,
  },
  'T-Style': {
    ...DEFAULT_CROSSHAIR,
    color: '#ffff00',
    size: 6,
    gap: 3,
    thickness: 2,
    dot: false,
    tStyle: true,
  },
};
