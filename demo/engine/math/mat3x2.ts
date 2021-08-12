import { vec2 } from './vec2'

export type mat3x2 = [
    number,number,
    number,number,
    number,number
]
export const mat3x2 = (): mat3x2 => mat3x2.identity(new Float32Array(6) as any)

mat3x2.identity = (out: mat3x2): mat3x2 => {
    out[0] = 1; out[1] = 0
    out[2] = 0; out[3] = 1
    out[4] = 0; out[5] = 0
    return out
}

mat3x2.copy = (mat: mat3x2, out: mat3x2): mat3x2 => {
    out[0] = mat[0]; out[1] = mat[1]
    out[2] = mat[2]; out[3] = mat[3]
    out[4] = mat[4]; out[5] = mat[5]
    return out
}

mat3x2.invert = (mat: mat3x2, out: mat3x2): mat3x2 => {
    const a = mat[0], b = mat[1],
          c = mat[2], d = mat[3],
          tx = mat[4], ty = mat[5]
    const determinant = a * d - b * c
    const invDet = determinant && 1 / determinant
    out[0] = d * invDet
    out[1] = -b * invDet
    out[2] = -c * invDet
    out[3] = a * invDet
    out[4] = (c * ty - d * tx) * invDet
    out[5] = (b * tx - a * ty) * invDet
    return out
}

mat3x2.multiply = (a: mat3x2, b: mat3x2, out: mat3x2): mat3x2 => {
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3]
    const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5]
    out[0] = a0 * b0 + a2 * b1
    out[1] = a1 * b0 + a3 * b1
    out[2] = a0 * b2 + a2 * b3
    out[3] = a1 * b2 + a3 * b3
    out[4] = a0 * b4 + a2 * b5 + a[4]
    out[5] = a1 * b4 + a3 * b5 + a[5]
    return out
}

mat3x2.orthogonal = (left: number, right: number, bottom: number, top: number, out: mat3x2): mat3x2 => {
    const lr = 1 / (left - right),
    bt = 1 / (bottom - top)
    out[0] = -2*lr; out[1] = 0
    out[2] = 0; out[3] = -2*bt
    out[4] = (left+right)*lr; out[5] = (top+bottom)*bt
    return out
}

mat3x2.transform = (vec: vec2, mat: mat3x2, out: vec2): vec2 => {
    const x = vec[0], y = vec[1]
    out[0] = mat[0] * x + mat[2] * y + mat[4]
    out[1] = mat[1] * x + mat[3] * y + mat[5]
    return out
}

mat3x2.fromTransform = (
    x: number, y: number,
    pivotX: number, pivotY: number,
    scaleX: number, scaleY: number,
    rotation: number,
    skewX: number, skewY: number,
    out: mat3x2
): mat3x2 => {
    out[0] = Math.cos(rotation + skewY) * scaleX
    out[1] = Math.sin(rotation + skewY) * scaleX
    out[2] = -Math.sin(rotation - skewX) * scaleY
    out[3] = Math.cos(rotation - skewX) * scaleY
    out[4] = x - pivotX * out[0] - pivotY * out[2]
    out[5] = y - pivotX * out[1] - pivotY * out[3]
    return out
}

mat3x2.IDENTITY = mat3x2()