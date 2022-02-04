import { vec2, vec4, mat3x2, aabb2 } from '../math'
import { GL } from '../webgl'
import { IMaterial } from '../pipeline'
import { ShaderMaterial } from './ShaderMaterial'

export class SpriteMaterial extends ShaderMaterial implements IMaterial {
    public static calculateUVMatrix(frame: aabb2, size: vec2, out: mat3x2): mat3x2 {
        out[0] = (frame[2] - frame[0] - 1) / size[0]
        out[1] = 0
        out[2] = 0
        out[3] = (frame[3] - frame[1] - 1) / size[1]
        out[4] = (frame[0] + 0.5) / size[0]
        out[5] = (frame[1] + 0.5) / size[1]
        return out
    }
    public static applyTransform(vertices: Float32Array, transform: mat3x2, out: Float32Array, offset: number = 0){
        const a = transform[0], b = transform[1],
        c = transform[2], d = transform[3],
        tx = transform[4], ty = transform[5]
        for(let i = vertices.length - 1; i > 0; i-=2){
            const x = vertices[i - 1], y = vertices[i]
            out[offset + i - 1] = a * x + c * y + tx
            out[offset + i] = b * x + d * y + ty
        }
    }
    static copy(source: SpriteMaterial, out: SpriteMaterial): SpriteMaterial {
        out.diffuse = source.diffuse
        out.normal = source.normal
        out.cullFace = source.cullFace
        out.blendMode = source.blendMode
        mat3x2.copy(source.uvMatrix, out.uvMatrix)
        vec2.copy(source.size, out.size)
        return out
    }
    public static create(texture: WebGLTexture, frame: aabb2, size: vec2): SpriteMaterial {
        const material = new SpriteMaterial()
        SpriteMaterial.calculateUVMatrix(frame, size, material.uvMatrix)
        vec2.set(frame[2] - frame[0], frame[3] - frame[1], material.size)
        material.diffuse = texture
        material.cullFace = GL.NONE
        return material
    }
    readonly size: vec2 = vec2(1,1)
    readonly uvMatrix: mat3x2 = mat3x2()
    constructor(readonly uvTransform: vec4 = vec4(0,0,1,1)){super()}
    diffuse: WebGLTexture
    normal?: WebGLTexture
    depthTest: number = GL.LEQUAL
    blendMode = ShaderMaterial.Premultiply
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        if('uUVTransform' in this.program.uniforms) this.program.uniforms['uUVTransform'] = this.uvTransform
    }
    merge(material: IMaterial): boolean {
        return super.merge(material) && (
            'uSamplers' in this.program.uniforms ||
            this.diffuse === (material as SpriteMaterial).diffuse
        )
    }
}