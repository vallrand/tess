import { vec3 } from './vec3'
export type aabb3 = [
    number,number,number,
    number,number,number
]
export const aabb3 = (
    left: number = Infinity, top: number = Infinity, far: number = Infinity,
    right: number = -Infinity, bottom: number = -Infinity, near: number = Infinity
): aabb3 => aabb3.set(left, top, far, right, bottom, near, new Float32Array(6) as any)

aabb3.set = (minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, out: aabb3): aabb3 => {
    out[0] = minX; out[1] = minY; out[2] = minZ;
    out[3] = maxX; out[4] = maxY; out[5] = maxZ;
    return out
}
aabb3.copy = (aabb: aabb3, out: aabb3): aabb3 => {
    out[0] = aabb[0]; out[1] = aabb[1]; out[2] = aabb[2]
    out[3] = aabb[3]; out[4] = aabb[4]; out[5] = aabb[5]
    return out
}
aabb3.overlap = (a: aabb3, b: aabb3): boolean => (
    a[0] <= b[3] && a[1] <= b[4] && a[2] <= b[5] &&
    a[3] >= b[0] && a[4] >= b[1] && a[5] >= b[2]
)
aabb3.contains = (a: aabb3, b: aabb3): boolean => (
    a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2] &&
    a[3] >= b[3] && a[4] >= b[4] && a[5] >= b[5]
)
aabb3.add = (a: aabb3, b: aabb3, out: aabb3): aabb3 => {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    out[3] = Math.max(a[3], b[3])
    out[4] = Math.max(a[4], b[4])
    out[5] = Math.max(a[5], b[5])
    return out
}
aabb3.insert = (aabb: aabb3, vertex: vec3, out: aabb3): aabb3 => {
    out[0] = Math.min(aabb[0], vertex[0])
    out[1] = Math.min(aabb[1], vertex[1])
    out[2] = Math.min(aabb[2], vertex[2])
    out[3] = Math.max(aabb[3], vertex[0])
    out[4] = Math.max(aabb[4], vertex[1])
    out[5] = Math.max(aabb[5], vertex[2])
    return out
}

aabb3.calculate = (vertices: Float32Array, stride: number, offset: number, out: aabb3): aabb3 => {
    aabb3.set(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity, out)
    for(let i = 0; i < vertices.length; i+=stride){
        out[0] = Math.min(out[0], vertices[i + offset + 0])
        out[1] = Math.min(out[1], vertices[i + offset + 1])
        out[2] = Math.min(out[2], vertices[i + offset + 2])
        out[3] = Math.max(out[3], vertices[i + offset + 0])
        out[4] = Math.max(out[4], vertices[i + offset + 1])
        out[5] = Math.max(out[5], vertices[i + offset + 2])
    }
    return out
}

aabb3.INFINITE = aabb3()