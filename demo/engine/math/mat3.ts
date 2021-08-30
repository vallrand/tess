import { vec3 } from './vec3'
import { mat3x2 } from './mat3x2'
import { mat4 } from './mat4'

export type mat3 = [
    number,number,number,
    number,number,number,
    number,number,number
]
export const mat3 = () => mat3.identity(new Float32Array(9) as any)

mat3.identity = (out: mat3): mat3 => {
    out[0] = 1; out[1] = 0; out[2] = 0
    out[3] = 0; out[4] = 1; out[5] = 0
    out[6] = 0; out[7] = 0; out[8] = 1
    return out
}

mat3.copy = (mat: mat3, out: mat3): mat3 => {
    out[0] = mat[0]; out[1] = mat[1]; out[2] = mat[2]
    out[3] = mat[3]; out[4] = mat[4]; out[5] = mat[5]
    out[6] = mat[6]; out[7] = mat[7]; out[8] = mat[8]
    return out
}

mat3.transpose = (mat: mat3, out: mat3): mat3 => {
    let temp = mat[1]; out[1] = mat[3]; out[3] = temp
    temp = mat[2]; out[2] = mat[6]; out[6] = temp
    temp = mat[5]; out[5] = mat[7]; out[7] = temp
    if(out === mat) return out
    out[0] = mat[0]; out[4] = mat[4]; out[8] = mat[8]
    return out
}

mat3.invert = (mat: mat3, out: mat3): mat3 => {
    const m00 = mat[0], m01 = mat[1], m02 = mat[2],
          m10 = mat[3], m11 = mat[4], m12 = mat[5],
          m20 = mat[6], m21 = mat[7], m22 = mat[8]
    const d01 = m22 * m11 - m12 * m21,
          d11 = -m22 * m10 + m12 * m20,
          d21 = m21 * m10 - m11 * m20
    let det = m00 * d01 + m01 * d11 + m02 * d21
    det = det ? 1 / det : 0
    out[0] = d01 * det
    out[1] = (-m22 * m01 + m02 * m21) * det
    out[2] = (m12 * m01 - m02 * m11) * det
    out[3] = d11 * det
    out[4] = (m22 * m00 - m02 * m20) * det
    out[5] = (-m12 * m00 + m02 * m10) * det
    out[6] = d21 * det
    out[7] = (-m21 * m00 + m01 * m20) * det
    out[8] = (m11 * m00 - m01 * m10) * det
    return out
}

mat3.multiply = (a: mat3, b: mat3, out: mat3): mat3 => {
    const a00 = a[0], a01 = a[1], a02 = a[2],
          a10 = a[3], a11 = a[4], a12 = a[5],
          a20 = a[6], a21 = a[7], a22 = a[8]
    let b0 = b[0], b1 = b[1], b2 = b[2]
    out[0] = b0 * a00 + b1 * a10 + b2 * a20
    out[1] = b0 * a01 + b1 * a11 + b2 * a21
    out[2] = b0 * a02 + b1 * a12 + b2 * a22
    b0 = b[3]; b1 = b[4]; b2 = b[5]
    out[3] = b0 * a00 + b1 * a10 + b2 * a20
    out[4] = b0 * a01 + b1 * a11 + b2 * a21
    out[5] = b0 * a02 + b1 * a12 + b2 * a22
    b0 = b[6]; b1 = b[7]; b2 = b[8]
    out[6] = b0 * a00 + b1 * a10 + b2 * a20
    out[7] = b0 * a01 + b1 * a11 + b2 * a21
    out[8] = b0 * a02 + b1 * a12 + b2 * a22
    return out
}


mat3.fromMat3x2 = (mat: mat3x2, out: mat3): mat3 => {
    out[0] = mat[0]; out[1] = mat[1]; out[2] = 0
    out[3] = mat[2]; out[4] = mat[3]; out[5] = 0
    out[6] = mat[4]; out[7] = mat[5]; out[8] = 1
    return out
}

mat3.fromMat4 = (mat: mat4, out: mat3): mat3 => {
    out[0] = mat[0]; out[1] = mat[1]; out[2] = mat[2]
    out[3] = mat[4]; out[4] = mat[5]; out[5] = mat[6]
    out[6] = mat[8]; out[7] = mat[9]; out[8] = mat[10]
    return out
}

mat3.fromQuat = (q: [number, number, number, number], out: mat3): mat3 => {
    const x = q[0], y = q[1], z = q[2], w = q[3],
          x2 = 2 * x,   y2 = 2 * y,     z2 = 2 * z,
          xx = x * x2,  yy = y * y2,    zz = z * z2,
          yx = x * y2,  zx = x * z2,    zy = y * z2,
          wx = w * x2,  wy = w * y2,    wz = w * z2
    out[0] = 1 - yy - zz;     out[1] = yx + wz;       out[2] = zx - wy
    out[3] = yx - wz;         out[4] = 1 - xx - zz;   out[5] = zy + wx
    out[6] = zx + wy;         out[7] = zy - wx;       out[8] = 1 - xx - yy
    return out
}

mat3.transform = (vec: vec3, mat: mat3, out: vec3): vec3 => {
    const x = vec[0], y = vec[1], z = vec[2]
    out[0] = mat[0] * x + mat[3] * y + mat[6] * z
    out[1] = mat[1] * x + mat[4] * y + mat[7] * z
    out[2] = mat[2] * x + mat[5] * y + mat[8] * z
    return out
}

mat3.normalMatrix = (mat: mat4, out: mat3): mat3 => {
    const m00 = mat[0], m01 = mat[1], m02 = mat[2],
    m10 = mat[4], m11 = mat[5], m12 = mat[6],
    m20 = mat[8], m21 = mat[9], m22 = mat[10]
    
    out[0] = m11 * m22 - m12 * m21
    out[1] = m12 * m20 - m10 * m22
    out[2] = m10 * m21 - m11 * m20

    out[3] = m02 * m21 - m01 * m22
    out[5] = m00 * m22 - m02 * m20
    out[7] = m01 * m20 - m00 * m21
    
    out[6] = m01 * m12 - m02 * m11
    out[7] = m02 * m10 - m00 * m12
    out[8] = m00 * m11 - m01 * m10

    let sx = Math.hypot(out[0], out[1], out[2]); sx = sx && 1/sx
    let sy = Math.hypot(out[3], out[4], out[5]); sy = sy && 1/sy
    let sz = Math.hypot(out[6], out[7], out[8]); sz = sz && 1/sz
    out[0] /= sx; out[1] /= sx; out[2] /= sx
    out[3] /= sy; out[4] /= sy; out[5] /= sy
    out[6] /= sz; out[7] /= sz; out[8] /= sz

    return out
}

mat3.IDENTITY = mat3()