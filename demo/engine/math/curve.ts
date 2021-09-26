import { vec3 } from './vec3'

export const quadraticBezier3D = (a: vec3, b: vec3, c: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, it = 1-t, it2 = it*it
    out[0] = it2 * a[0] + 2*t*it * b[0] + t2 * c[0]
    out[1] = it2 * a[1] + 2*t*it * b[1] + t2 * c[1]
    out[2] = it2 * a[2] + 2*t*it * b[2] + t2 * c[2]
    return out
}

export const cubicBezier3D = (a: vec3, b: vec3, c: vec3, d: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, t3 = t*t*t, it = 1-t, it2 = it*it, it3 = it2*it
    out[0] = it3 * a[0] + 3 * t * it2 * b[0] + 3 * t2 * it * c[0] + t3 * d[0]
    out[1] = it3 * a[1] + 3 * t * it2 * b[1] + 3 * t2 * it * c[1] + t3 * d[1]
    out[2] = it3 * a[2] + 3 * t * it2 * b[2] + 3 * t2 * it * c[2] + t3 * d[2]
    return out
}

export const quadraticBezierNormal3D = (a: vec3, b: vec3, c: vec3, t: number, out: vec3): vec3 => {
    out[0] = 2 * (1 - t) * (b[0] - a[0]) + 2 * t * (c[0] - b[0])
    out[1] = 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (c[1] - b[1])
    out[2] = 2 * (1 - t) * (b[2] - a[2]) + 2 * t * (c[2] - b[2])
    return out
}

export const cubicBezierNormal3D = (a: vec3, b: vec3, c: vec3, d: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, it = 1 - t, i2 = it*it
    out[0] = 3 * i2 * (b[0] - a[0]) + 6 * it * t * (c[0] - b[0]) + 3 * t2 * (d[0] - c[0])
    out[1] = 3 * i2 * (b[1] - a[1]) + 6 * it * t * (c[1] - b[1]) + 3 * t2 * (d[1] - c[1])
    out[2] = 3 * i2 * (b[2] - a[2]) + 6 * it * t * (c[2] - b[2]) + 3 * t2 * (d[2] - c[2])
    return out
}