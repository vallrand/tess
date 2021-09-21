import { vec3 } from './vec3'

export const quadraticBezier3D = (a: vec3, b: vec3, c: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, it = 1-t, it2 = it*it
    out[0] = it2 * a[0] + 2*t*it * b[0] + t2 * c[0]
    out[1] = it2 * a[1] + 2*t*it * b[1] + t2 * c[1]
    out[2] = it2 * a[2] + 2*t*it * b[2] + t2 * c[2]
    return out
}

export const quadraticBezierNormal3D = (a: vec3, b: vec3, c: vec3, t: number, out: vec3): vec3 => {
    out[0] = 2 * (1 - t) * (b[0] - a[0]) + 2 * t * (c[0] - b[0])
    out[1] = 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (c[1] - b[1])
    out[2] = 2 * (1 - t) * (b[2] - a[2]) + 2 * t * (c[2] - b[2])
    return out
}