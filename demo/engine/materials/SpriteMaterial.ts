import { vec2, vec3, vec4, mat4, mat3x2, aabb2 } from '../math'
import { GL, ShaderProgram } from '../webgl'
import { IMaterial } from '../pipeline'
import { ShaderMaterial } from './ShaderMaterial'

export class SpriteMaterial extends ShaderMaterial implements IMaterial {
    readonly uvTransform: vec4 = vec4(0,0,1,1)
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