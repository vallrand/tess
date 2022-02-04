export const uint8x4 = (r: number, g: number, b: number, a: number): number =>
(0xFF & r) | (0xFF00 & g << 8) | (0xFF0000 & b << 16) | (0xFF000000 & a << 24)
export const uint16x2 = (u: number, v: number): number => 
(0xFFFF0000 & v << 16) | 0xFFFF & u

export const uintNorm4x8 = (r: number, g: number, b: number, a: number): number =>
(0xFF * r) | (0xFF * g << 8) | (0xFF * b << 16) | (0xFF * a << 24)
export const uintNorm2x16 = (u: number, v: number): number => 
(0xFFFF * v << 16) | 0xFFFF & (0xFFFF * u | 0)

export const intNorm4x8 = (x: number, y: number, z: number, w: number): number =>
(0x7F * x & 0xFF) | ((0x7F * y & 0xFF) << 8) | ((0x7F * z & 0xFF) << 16) | ((0x7F * w & 0xFF) << 24)