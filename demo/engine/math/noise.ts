import { lerp, clamp } from './common'

const bitmask0 = 0xb5297a4d
const bitmask1 = 0x68e31da4
const bitmask2 = 0x1b56c4e9
const prime0 = 0xbd4bcb5
const prime1 = 0x63d68d

export function noise1D(hash: number, seed: number): number {
    hash *= bitmask0
    hash += seed
    hash ^= hash >> 8
    hash += bitmask1
    hash ^= hash >> 8
    hash *= bitmask2
    hash ^= hash >> 8
    return hash / 0x7fffffff
}

export const noise2D = (x: number, y: number, seed: number): number => noise1D(x + prime0 * y, seed)
export const noise3D = (x: number, y: number, z: number, seed: number): number => noise1D(x + prime0 * y + prime1 * z, seed)

