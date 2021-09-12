import { IMaterial } from '../pipeline'
import { GL, UniformSamplerBindings } from '../webgl'
import { ShaderMaterial } from './ShaderMaterial'

export class EmitterMaterial extends ShaderMaterial implements IMaterial {
    diffuse: WebGLTexture
    gradientRamp?: WebGLTexture
    curveSampler?: WebGLTexture
    displacementMap?: WebGLTexture

    depthTest = GL.LEQUAL
    cullFace = GL.NONE
    depthWrite = false
    blendMode = ShaderMaterial.Premultiply
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, this.diffuse)
        if(this.gradientRamp){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uGradient)
            gl.bindTexture(GL.TEXTURE_2D, this.gradientRamp)
        }
        if(this.curveSampler){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uAttributes)
            gl.bindTexture(GL.TEXTURE_2D, this.curveSampler)
        }
        if(this.displacementMap){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDisplacementMap)
            gl.bindTexture(GL.TEXTURE_2D, this.displacementMap)
        }
    }
}