import { clamp, lerp, mod } from '../../engine/math/common'
import { noise2D } from '../../engine/math/noise'

function smootherstep(edge0: number, edge1: number, x: number): number {
    x = clamp((x - edge0)/(edge1 - edge0), 0.0, 1.0)
    return x * x * x * (x * (x * 6 - 15) + 10)
}
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