import { lerp } from './common'

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

export const shuffle = <T>(out: T[], random: () => number): T[] => {
    for(let i = out.length - 1; i > 0; i--){
        let j = (random() * (i + 1)) | 0
        let temp: T = out[i]
        out[i] = out[j]
        out[j] = temp
    }
    return out
}

export const mulberry32 = (seed: number = 0X1F6) => function(): number {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
}

export const randomFloat = (min: number, max: number, random: number): number => random * (max - min) + min
export const randomInt = (min: number, max: number, random: number): number => Math.floor(random * (max - min + 1)) + min


const fade = (x: number): number => x*x*x*(x*(x*6-15)+10)
function dotGridGradient(ix: number, iy: number, dx: number, dy: number, seed: number): number {
    const angle = 2 * Math.PI * noise2D(ix, iy, seed)
    return dx * Math.cos(angle) + dy * Math.sin(angle)
}
export function perlin2D(x: number, y: number, seed: number): number {
    let ix = Math.floor(x), iy = Math.floor(y)
    x -= ix; y -= iy
    const n00 = dotGridGradient(ix, iy, x, y, seed)
    const n01 = dotGridGradient(ix + 1, iy, x - 1, y, seed)
    const n10 = dotGridGradient(ix, iy + 1, x, y - 1, seed)
    const n11 = dotGridGradient(ix + 1, iy + 1, x - 1, y - 1, seed)
    const u = fade(x), v = fade(y)
    return lerp(lerp(n00, n01, u), lerp(n10, n11, u), v)
}