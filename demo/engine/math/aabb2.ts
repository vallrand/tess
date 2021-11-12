import { vec2 } from './vec2'
export type aabb2 = [
    number,number,
    number,number
]
export const aabb2 = (
    left: number = Infinity, top: number = Infinity,
    right: number = -Infinity, bottom: number = -Infinity
): aabb2 => aabb2.set(left, top, right, bottom, new Float32Array(4) as any)

aabb2.copy = (aabb: aabb2, out: aabb2): aabb2 => {
    out[0] = aabb[0]
    out[1] = aabb[1]
    out[2] = aabb[2]
    out[3] = aabb[3]
    return out
}
aabb2.set = (minX: number, minY: number, maxX: number, maxY: number, out: aabb2): aabb2 => {
    out[0] = minX; out[1] = minY
    out[2] = maxX; out[3] = maxY
    return out
}
aabb2.overlap = (a: aabb2, b: aabb2): boolean => (
    a[0] <= b[2] && a[1] <= b[3] &&
    a[2] >= b[0] && a[3] >= b[1]
)
aabb2.contains = (a: aabb2, b: aabb2): boolean => (
    a[0] <= b[0] && a[1] <= b[1] &&
    a[2] >= b[2] && a[3] >= b[3]
)
aabb2.add = (a: aabb2, b: aabb2, out: aabb2): aabb2 => {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    out[3] = Math.max(a[3], b[3])
    return out
}
aabb2.intersect = (a: aabb2, b: aabb2, out: aabb2): aabb2 => {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    out[3] = Math.min(a[3], b[3])
    return out
}
aabb2.pad = (aabb: aabb2, padding: number, out: aabb2): aabb2 => {
    out[0] = aabb[0] - padding
    out[1] = aabb[1] - padding
    out[2] = aabb[2] + padding
    out[3] = aabb[3] + padding
    return out
}
aabb2.inside = (bounds: aabb2, tile: vec2): boolean => (
    tile[0] >= bounds[0] && tile[1] >= bounds[1] &&
    tile[0] < bounds[3] && tile[1] < bounds[3]
)

aabb2.INFINITE = aabb2()