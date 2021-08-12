import { vec2 } from './vec2'

export type mat2 = [
    number,number,
    number,number
]
export const mat2 = () => mat2.identity(new Float32Array(4) as any)

mat2.identity = (out: mat2): mat2 => {
    out[0] = 1; out[1] = 0
    out[2] = 0; out[3] = 1
    return out
}

mat2.copy = (mat: mat2, out: mat2): mat2 => {
    out[0] = mat[0]; out[1] = mat[1]
    out[2] = mat[2]; out[3] = mat[3]
    return out
}

mat2.transpose = (mat: mat2, out: mat2): mat2 => {
    let temp = mat[1]; out[1] = mat[2]; out[2] = temp
    if(out === mat) return out
    out[0] = mat[0]; out[3] = mat[3]
    return out
}

mat2.invert = (mat: mat2, out: mat2): mat2 => {
    const m00 = mat[0], m01 = mat[1],
          m10 = mat[2], m11 = mat[3]
    let det = m00 * m11 - m10 * m01
    det = det ? 1 / det : 0
    out[0] = m11 * det; out[1] =-m01 * det
    out[2] =-m10 * det; out[3] = m00 * det
    return out
}

mat2.multiply = (a: mat2, b: mat2, out: mat2): mat2 => {
    const a00 = a[0], a01 = a[1],
          a10 = a[2], a11 = a[3]
    const b00 = b[0], b01 = b[1],
          b10 = b[2], b11 = b[3];
    out[0] = a00 * b00 + a10 * b01
    out[1] = a01 * b00 + a11 * b01
    out[2] = a00 * b10 + a10 * b11
    out[3] = a01 * b10 + a11 * b11
    return out
}

mat2.transform = (vec: vec2, mat: mat2, out: vec2): vec2 => {
    const x = vec[0], y = vec[1]
    out[0] = mat[0] * x + mat[2] * y
    out[1] = mat[1] * x + mat[3] * y
    return out
}