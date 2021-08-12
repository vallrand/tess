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
    Particle: <IVertexAttribute[]> [
        { name: 'position', size: 3, type: GL.FLOAT, normalized: false, stride: 0, offset: 0 }
    ]
}