import { GL, ShaderProgram, UniformBlock, UniformBlockBindings, UniformSamplerBindings } from '../webgl'
import { IMaterial } from '../pipeline'
import * as shaders from '../shaders'
import { ShaderMaterial } from './ShaderMaterial'
import { vec4 } from '../math'

export class EffectMaterial<T> extends ShaderMaterial implements IMaterial {
    depthTest: number = GL.LEQUAL
    blendMode = ShaderMaterial.Premultiply
    diffuse: WebGLTexture
    displacement?: WebGLTexture
    gradient?: WebGLTexture
    public readonly uniform: UniformBlock<T>
    public readonly uvTransform: vec4
    constructor(gl: WebGL2RenderingContext, options: {[key:string]: number | boolean}, initial: T){
        super()
        this.program = ShaderProgram(gl, shaders.batch_vert, shaders.vfx_frag, options)
        this.uniform = new UniformBlock<T>(gl, this.program.uniforms['EffectUniforms'], UniformBlockBindings.EffectUniforms)
        for(let key in initial) (this.uniform.uniforms[key] as any).set(initial[key], 0)
    }
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        this.uniform.bind(gl, UniformBlockBindings.EffectUniforms)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDiffuseMap)
        gl.bindTexture(GL.TEXTURE_2D, this.diffuse)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uGradientMap)
        gl.bindTexture(GL.TEXTURE_2D, this.gradient)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDisplacementMap)
        gl.bindTexture(GL.TEXTURE_2D, this.displacement)
    }
    merge(material: IMaterial): boolean {
        return super.merge(material) && material === this
    }
}