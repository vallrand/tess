export type vec3 = [number, number, number]
export const vec3 = (x: number = 0, y: number = 0, z: number = 0): vec3 =>
vec3.set(x, y, z, new Float32Array(3) as any)

vec3.copy = (vec: vec3, out: vec3): vec3 => {
    out[0] = vec[0]
    out[1] = vec[1]
    out[2] = vec[2]
    return out
}
vec3.set = (x: number, y: number, z: number, out: vec3): vec3 => {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}

vec3.dot = (a: vec3, b: vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

vec3.subtract = (a: vec3, b: vec3, out: vec3): vec3 => {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}

vec3.add = (a: vec3, b: vec3, out: vec3): vec3 => {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}

vec3.cross = (a: vec3, b: vec3, out: vec3): vec3 => {
    const ax = a[0], ay = a[1], az = a[2]
    const bx = b[0], by = b[1], bz = b[2]
    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
  
vec3.magnitudeSquared = (vec: vec3): number => vec[0]*vec[0] + vec[1]*vec[1] + vec[2]*vec[2]
vec3.distanceSquared = (a: vec3, b: vec3): number => {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    const dz = a[2] - b[2]
    return dx*dx + dy*dy + dz*dz
}
vec3.magnitude = (vec: vec3): number => Math.sqrt(vec3.magnitudeSquared(vec))
vec3.distance = (a: vec3, b: vec3): number => Math.sqrt(vec3.distanceSquared(a, b))
vec3.normalize = (vec: vec3, out: vec3): vec3 => {
    const x = vec[0], y = vec[1], z = vec[2]
    const lengthSqrt = x*x + y*y + z*z
    const invLength = lengthSqrt && 1 / Math.sqrt(lengthSqrt)
    out[0] = x * invLength
    out[1] = y * invLength
    out[2] = z * invLength
    return out
}
  
vec3.scale = (vec: vec3, s: number, out: vec3): vec3 => {
    out[0] = vec[0] * s
    out[1] = vec[1] * s
    out[2] = vec[2] * s
    return out
}

vec3.multiply = (a: vec3, b: vec3, out: vec3): vec3 => {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}

vec3.lerp = (a: vec3, b: vec3, t: number, out: vec3): vec3 => {
    out[0] = a[0] + t * (b[0] - a[0])
    out[1] = a[1] + t * (b[1] - a[1])
    out[2] = a[2] + t * (b[2] - a[2])
    return out
}

vec3.angle = (a: vec3, b: vec3): number => {
    const magnitude = Math.sqrt(vec3.magnitudeSquared(a) * vec3.magnitudeSquared(b))
    const cosine = magnitude && vec3.dot(a, b) / magnitude
    return Math.acos(Math.min(Math.max(cosine, -1), 1))
}

vec3.random = (r: number, z: number, out: vec3): vec3 => {
    r = r * 2 * Math.PI
    z = z * 2 - 1
    out[2] = z
    z = Math.sqrt(1 - z*z)
    out[0] = Math.cos(r) * z
    out[1] = Math.sin(r) * z
    return out
}

vec3.equals = (a: vec3, b: vec3, tolerance: number): boolean => (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance
)

vec3.orthogonal = (v: vec3, out: vec3): vec3 => {
    const x = Math.abs(v[0]), y = Math.abs(v[1]), z = Math.abs(v[2])
    const axis = x < y ? (x < z ? vec3.AXIS_X : vec3.AXIS_Z) : (y < z ? vec3.AXIS_Y : vec3.AXIS_Z)
    vec3.cross(v, axis, out)
    return out
}

vec3.slerp = (from: vec3, to: vec3, t: number, out: vec3): vec3 => {
    const theta = vec3.angle(from, to)
    const sin = Math.sin(theta)
    const a = Math.sin((1-t) * theta) / sin
    const b = Math.sin(t * theta) / sin
    out[0] = from[0] * a + to[0] * b
    out[1] = from[1] * a + to[1] * b
    out[2] = from[2] * a + to[2] * b
    return out
}

vec3.project = (vector: vec3, normal: vec3, out: vec3): vec3 => {
    const squareMagnitude = vec3.magnitudeSquared(normal)
    const scale = squareMagnitude && vec3.dot(vector, normal) / squareMagnitude
    return vec3.scale(normal, scale, out)
}

vec3.projectPlane = (vector: vec3, normal: vec3, out: vec3): vec3 => {
    vec3.project(vector, normal, out)
    return vec3.subtract(vector, out, out)
}

vec3.ZERO = vec3(0, 0, 0)
vec3.ONE = vec3(1, 1, 1)
vec3.AXIS_X = vec3(1, 0, 0)
vec3.AXIS_Y = vec3(0, 1, 0)
vec3.AXIS_Z = vec3(0, 0, 1)