import { vec3 } from './vec3'
import { vec4 } from './vec4'

export type quat = vec4
export const quat = (): quat => vec4(0,0,0,1)

quat.copy = vec4.copy
quat.normalize = vec4.normalize

quat.multiply = (q1: quat, q2: quat, out: quat): quat => {
    const x1 = q1[0], y1 = q1[1], z1 = q1[2], w1 = q1[3],
          x2 = q2[0], y2 = q2[1], z2 = q2[2], w2 = q2[3]
    out[0] = x1 * w2 + w1 * x2 + y1 * z2 - z1 * y2
    out[1] = y1 * w2 + w1 * y2 + z1 * x2 - x1 * z2
    out[2] = z1 * w2 + w1 * z2 + x1 * y2 - y1 * x2
    out[3] = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
    return out
}

quat.conjugate = (q: quat, out: quat): quat => {
    out[0] = -q[0]
    out[1] = -q[1]
    out[2] = -q[2]
    out[3] = q[3]
    return out
}

quat.transform = (v: vec4 | vec3, q: quat, out: vec4 | vec3): vec4 | vec3 => {
    const x = v[0], y = v[1], z = v[2],
    rx = q[0], ry = q[1], rz = q[2], rw = q[3],
    ix = rw * x + ry * z - rz * y,
    iy = rw * y + rz * x - rx * z,
    iz = rw * z + rx * y - ry * x,
    iw = -rx * x - ry * y - rz * z

    out[0] = ix * rw + iw * -rx + iy * -rz - iz * -ry
    out[1] = iy * rw + iw * -ry + iz * -rx - ix * -rz
    out[2] = iz * rw + iw * -rz + ix * -ry - iy * -rx
    out[3] = v[3] == null ? 1 : v[3]
    return out
}

quat.slerp = (q1: quat, q2: quat, f: number, out: quat): quat => {
    const x1 = q1[0], y1 = q1[1], z1 = q1[2], w1 = q1[3],
          x2 = q2[0], y2 = q2[1], z2 = q2[2], w2 = q2[3],
          cosTheta = x1 * x2 + y1 * y2 + z1 * z2 + w1 * w2, absCosTheta = Math.abs(cosTheta)
    let t0 = 1 - f, t1 = f
    if(1.0 - absCosTheta > 1e-6){
        const theta = Math.acos(absCosTheta)
        const sinTheta = Math.sin(theta)
        t0 = Math.sin(t0 * theta) / sinTheta
        t1 = Math.sin(t1 * theta) / sinTheta
    }
    if(cosTheta < 0) t1 *= -1
    out[0] = t0 * x1 + t1 * x2
    out[1] = t0 * y1 + t1 * y2
    out[2] = t0 * z1 + t1 * z2
    out[3] = t0 * w1 + t1 * w2
    return out
}

quat.axisAngle = (axis: vec3, angle: number, out: quat): quat => {
    const sin = Math.sin(angle*=0.5)
    out[0] = sin * axis[0]
    out[1] = sin * axis[1]
    out[2] = sin * axis[2]
    out[3] = Math.cos(angle)
    return out
}

const eulerOrder = {
    xyz: [1,-1,1,-1],
    xzy: [-1,-1,1,1],
    yxz: [1,-1,-1,1],
    yzx: [1,1,-1,-1],
    zxy: [-1,1,1,-1],
    zyx: [-1,1,-1,1]
}
type EulerOrder = keyof typeof eulerOrder

quat.euler = (x: number, y: number, z: number, order: EulerOrder, out: quat): quat => {
    const sinx = Math.sin(x*=0.5), cosx = Math.cos(x)
    const siny = Math.sin(y*=0.5), cosy = Math.cos(y)
    const sinz = Math.sin(z*=0.5), cosz = Math.cos(z)
    const sign = eulerOrder[order]
    out[0] = sinx * cosy * cosz + sign[0] * cosx * siny * sinz
    out[1] = cosx * siny * cosz + sign[1] * sinx * cosy * sinz
    out[2] = cosx * cosy * sinz + sign[2] * sinx * siny * cosz
    out[3] = cosx * cosy * cosz + sign[3] * sinx * siny * sinz
    return out
}

quat.rotationTo = (a: vec3, b: vec3, out: quat): quat => {
    const dot = vec3.dot(a, b)
    const magnitude = Math.sqrt(vec3.magnitudeSquared(a) * vec3.magnitudeSquared(b))
    const cosTheta = dot / magnitude
    if(cosTheta >= 1) return quat.copy(quat.IDENTITY, out)
    else if(cosTheta <= -1){
        const x = Math.abs(a[0]), y = Math.abs(a[1]), z = Math.abs(a[2])
        const orthogonal = x < y ? (x < z ? vec3.AXIS_X : vec3.AXIS_Z) : (y < z ? vec3.AXIS_Y : vec3.AXIS_Z)
        vec3.cross(a, orthogonal, out as any)
        vec3.normalize(out as any, out as any)
        out[3] = 0
        return out
    }
    vec3.cross(a, b, out as any)
    out[3] = magnitude + dot
    return quat.normalize(out, out)
}

quat.IDENTITY = quat()