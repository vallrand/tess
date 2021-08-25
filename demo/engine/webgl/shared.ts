import { GL } from './constants'

export const UniformBlockBindings = {
    CameraUniforms: 0,
    ModelUniforms: 1,
    LightUniforms: 2,
    GlobalUniforms: 3,
    EmitterUniforms: 2
}

export const UniformSamplerBindings = {
    uSampler: 0,
    uGradient: 1,
    uAttributes: 6,
    uDiffuseMap: 0,
    uNormalMap: 1,
    uPositionBuffer: 2,
    uNormalBuffer: 3,
    uAlbedoBuffer: 4,
    uArrayMap: 7
}

export interface IVertexAttribute {
    name: string
    size: number
    type: number
    normalized?: boolean
    stride?: number
    offset?: number
    divisor?: number
}

export const VertexDataFormat = {
    Skinned: {

    },
    Static: <IVertexAttribute[]> [
        { name: 'index', size: 1, type: GL.UNSIGNED_SHORT },
        { name: 'position', size: 3, type: GL.FLOAT, normalized: false, stride: 32, offset: 0 },
        { name: 'normal', size: 3, type: GL.FLOAT, normalized: false, stride: 32, offset: 12 },
        { name: 'uv', size: 2, type: GL.FLOAT, normalized: false, stride: 32, offset: 24 }
    ],
    Batched2D: <IVertexAttribute[]> [
        { name: 'index', size: 1, type: GL.UNSIGNED_SHORT },
        { name: 'position', size: 2, type: GL.FLOAT, normalized: false, stride: 20, offset: 0 },
        { name: 'uv', size: 2, type: GL.UNSIGNED_SHORT, normalized: true, stride: 20, offset: 8 },
        { name: 'color', size:4, type: GL.UNSIGNED_BYTE, normalized: true, stride: 20, offset: 12 },
        { name: 'material', size: 4, type: GL.UNSIGNED_BYTE, normalized: false, stride: 20, offset: 16 }
    ],
    Batched: <IVertexAttribute[]> [
        { name: 'index', size: 1, type: GL.UNSIGNED_SHORT },
        { name: 'position', size: 3, type: GL.FLOAT, normalized: false, stride: 24, offset: 0 },
        { name: 'uv', size: 2, type: GL.UNSIGNED_SHORT, normalized: true, stride: 24, offset: 12 },
        { name: 'color', size: 4, type: GL.UNSIGNED_BYTE, normalized: true, stride: 24, offset: 16 },
        { name: 'domain', size: 3, type: GL.UNSIGNED_BYTE, normalized: false, stride: 24, offset: 20 },
        { name: 'material', size: 1, type: GL.UNSIGNED_BYTE, normalized: false, stride: 24, offset: 23 }
    ],
    Particle: <IVertexAttribute[]> [
        { name: 'aTransform', size: 4, type: GL.FLOAT, normalized: false, stride: 68, offset: 0 },
        { name: 'aVelocity', size: 4, type: GL.FLOAT, normalized: false, stride: 68, offset: 16 },
        { name: 'aAcceleration', size: 4, type: GL.FLOAT, normalized: false, stride: 68, offset: 32 },
        { name: 'aLifetime', size: 3, type: GL.FLOAT, normalized: false, stride: 68, offset: 48 },
        { name: 'aSize', size: 2, type: GL.FLOAT, normalized: false, stride: 68, offset: 60 }
    ]
}

export const GLSLTypeSize = {
    [GL.INT]: 1,
    [GL.SAMPLER_2D]: 1,
    [GL.SAMPLER_2D_ARRAY]: 1,
    [GL.FLOAT]: 1,
    [GL.FLOAT_VEC2]: 2,
    [GL.FLOAT_VEC3]: 3,
    [GL.FLOAT_VEC4]: 4,
    [GL.FLOAT_MAT2]: 4,
    [GL.FLOAT_MAT3]: 9,
    [GL.FLOAT_MAT4]: 16
}
export const GLSLDataType = {
    [GL.INT]: Int32Array,
    [GL.SAMPLER_2D]: Int32Array,
    [GL.SAMPLER_2D_ARRAY]: Int32Array,
    [GL.FLOAT]: Float32Array,
    [GL.FLOAT_VEC2]: Float32Array,
    [GL.FLOAT_VEC3]: Float32Array,
    [GL.FLOAT_VEC4]: Float32Array,
    [GL.FLOAT_MAT2]: Float32Array,
    [GL.FLOAT_MAT3]: Float32Array,
    [GL.FLOAT_MAT4]: Float32Array
}