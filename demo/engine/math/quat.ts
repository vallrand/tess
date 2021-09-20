import { vec3 } from './vec3'
import { vec4 } from './vec4'

export type quat = vec4
export const quat = (): quat => vec4(0,0,0,1)

quat.copy = vec4.copy
quat.set = vec4.set
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

quat.transform = <T extends vec3 | vec4>(v: vec4 | vec3, q: quat, out: T): T => {
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

quat.extractEuler = (q: quat, order: EulerOrder, out: vec3): vec3 => {
    const x = q[0], y = q[1], z = q[2], w = q[3]
    const x2 = x*x, y2 = y*y, z2 = x*x
    switch(order){
        case 'yzx': {
            const det = x*y + z*w, sign = det < 0 ? -1 : 1
            if(det * sign > 0.5 - Number.EPSILON){
                out[1] = sign * 2 * Math.atan2(x, w)
                out[2] = sign * 0.5 * Math.PI
                out[0] = 0
            }else{
                out[1] = Math.atan2(2*y*w - 2*x*z, 1 - 2*y2 - 2*z2)
                out[2] = Math.asin(2 * det)
                out[0] = Math.atan2(2*x*w - 2*y*z , 1 - 2*x2 - 2*z2)
            }
            break
        }
        case 'xyz': {
            const det = x*w - y*z, sign = det < 0 ? -1 : 1
            if(det * sign > 0.5 - Number.EPSILON){
                out[1] = sign * 2 * Math.atan2(y, x)
                out[0] = sign * 0.5 * Math.PI
                out[2] = 0
            }else{
                out[1] = Math.atan2(2*w*y + 2*z*x, 1 - 2*x2 - 2*y2)
                out[0] = Math.asin(2 * det)
                out[2] = Math.atan2(2*w*z + 2*x*y, 1 - 2*z2 - 2*x2)
            }
            break
        }
    }
    return out
}


quat.rotation = (a: vec3, b: vec3, out: quat): quat => {
    const dot = vec3.dot(a, b)
    const magnitude = Math.sqrt(vec3.magnitudeSquared(a) * vec3.magnitudeSquared(b))
    const cosTheta = dot / magnitude
    if(cosTheta >= 1) return quat.copy(quat.IDENTITY, out)
    else if(cosTheta <= -1){
        vec3.orthogonal(a, out as any)
        vec3.normalize(out as any, out as any)
        out[3] = 0
        return out
    }
    vec3.cross(a, b, out as any)
    out[3] = magnitude + dot
    return quat.normalize(out, out)
}

quat.unitRotation = (start: vec3, end: vec3, out: quat): quat => {
    const dot = vec3.dot(start, end)
    if(dot >= 1) return quat.copy(quat.IDENTITY, out)
    else if(dot <= -1){
        vec3.orthogonal(start, out as any)
        out[3] = 0
    }else{
        vec3.cross(start, end, out as any)
        out[3] = 1 + dot
    }
    return quat.normalize(out, out)
}

quat.fromNormal = (forward: vec3, up: vec3, out: quat): quat => {
    const m20 = forward[0], m21 = forward[1], m22 = forward[2]
    const temp: vec3 = out as any
    vec3.cross(up, forward, temp)
    vec3.normalize(temp, temp)
    const m00 = temp[0], m01 = temp[1], m02 = temp[2]
    vec3.cross(forward, temp, temp)
    const m10 = temp[0], m11 = temp[1], m12 = temp[2]
    const trace = m00 + m11 + m22
    if(trace > 0){
        let root = 0.5 / Math.sqrt(trace + 1)
        out[0] = (m12 - m21) * root
        out[1] = (m20 - m02) * root
        out[2] = (m01 - m10) * root
        out[3] = 0.25 / root
    }else if (m00 >= m11 && m00 >= m22){
         let root = 0.5 / Math.sqrt(1 + m00 - m11 - m22)
         out[0] = 0.25 / root
         out[1] = (m01 + m10) * root
         out[2] = (m02 + m20) * root
         out[3] = (m12 - m21) * root
     }else if(m11 > m22){
         let root = 0.5 / Math.sqrt(1 + m11 - m00 - m22)
         out[0] = (m10 + m01) * root
         out[1] = 0.25 / root
         out[2] = (m21 + m12) * root
         out[3] = (m20 - m02) * root
     }else{
         let root = 0.5 / Math.sqrt(1 + m22 - m00 - m11)
         out[0] = (m20 + m02) * root
         out[1] = (m21 + m12) * root
         out[2] = 0.25 / root
         out[3] = (m01 - m10) * root
     }
     return out
}

quat.angle = (a: quat, b: quat): number => {
    const dot = vec4.dot(a, b)
    return Math.acos(2 * dot * dot - 1)
}

quat.pow = (q: quat, power: number, out: quat): quat => {
    const angle = 2 * Math.acos(q[3])
    vec3.normalize(q as any, out as any)
    const halfcos = Math.cos(0.5 * power * angle)
    const halfsin = Math.sin(0.5 * power * angle)
    out[0] *= halfsin
    out[1] *= halfsin
    out[2] *= halfsin
    out[3] = halfcos
    return out
}

quat.decompose = (quaternion: quat, twistAxis: vec3, swing: quat, twist: quat): void => {
	const dot = vec3.dot(twistAxis, quaternion as any)
	vec3.scale(twistAxis, dot, twist as any)
	twist[3] = quaternion[3]
	 if(vec4.dot(twist, twist) < Number.EPSILON){
		quat.copy(quaternion, swing)
		quat.copy(quat.IDENTITY, twist)
		return
	}
	quat.normalize(twist, twist)
	quat.conjugate(twist, swing)
	quat.multiply(quaternion, swing, swing)
}

quat.IDENTITY = quat()