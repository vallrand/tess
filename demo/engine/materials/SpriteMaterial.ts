import { Application } from '../framework'
import { vec2, vec3, vec4, mat4, mat3x2, aabb2 } from '../math'
import { GL, ShaderProgram } from '../webgl'
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
    readonly size: vec2 = vec2(1,1)
    readonly uvMatrix: mat3x2 = mat3x2()
    diffuse: WebGLTexture
    normal?: WebGLTexture
    domain: vec3 = vec3(0,0,0)
    depthTest: number = GL.LEQUAL
    blendMode = ShaderMaterial.Premultiply
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
    }
    merge(material: IMaterial): boolean {
        return super.merge(material) && (
            'uSamplers' in this.program.uniforms ||
            this.diffuse === (material as SpriteMaterial).diffuse
        )
    }
}