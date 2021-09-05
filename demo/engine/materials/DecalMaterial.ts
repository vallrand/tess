import { vec4 } from '../math'
import { IMaterial } from '../pipeline'
import { GL, UniformSamplerBindings } from '../webgl'
import { ShaderMaterial } from './ShaderMaterial'

export class DecalMaterial extends ShaderMaterial {
    readonly uvTransform: vec4 = vec4(0,0,1,1)
    diffuse: WebGLTexture
    normal?: WebGLTexture
    depthTest = GL.GEQUAL
    cullFace = GL.FRONT
    depthWrite = false
    blendMode = ShaderMaterial.Premultiply
    layer: number = 1
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        // gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDiffuseMap)
        // gl.bindTexture(GL.TEXTURE_2D, this.diffuse)
        // gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        // gl.bindTexture(GL.TEXTURE_2D, this.normal)
    }
    merge(material: IMaterial): boolean {
        return super.merge(material) && (
            this.diffuse === (material as DecalMaterial).diffuse
        )
    }
}