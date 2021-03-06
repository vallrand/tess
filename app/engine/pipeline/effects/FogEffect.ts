import { GL, ShaderProgram, UniformSamplerBindings } from '../../webgl'
import { vec2, vec4 } from '../../math'
import { IPostEffect, PostEffectPass } from '../PostEffectPass'
import * as shaders from '../../shaders'
import { Application } from '../../framework'

export class FogEffect implements IPostEffect {
    public enabled: boolean = true
    public readonly color: vec4 = vec4(0.2,0.2,0.2,0)
    public readonly range: vec2 = vec2(5,30)
    public readonly height: vec2 = vec2(0, 1)
    public frame: number = 0
    private readonly program: ShaderProgram
    constructor(private readonly context: Application){
        this.program = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fog_frag, {
            LINEAR_FOG: true, HALFSPACE: true, BLOOM: true
        })
        this.program.uniforms['uBloomMap'] = UniformSamplerBindings.uNormalMap

    }
    get active(): boolean { return this.enabled }
    apply(effectPass: PostEffectPass, last: boolean): void {
        const { gl } = this.context

        gl.disable(GL.DEPTH_TEST)
        gl.disable(GL.BLEND)
        gl.disable(GL.CULL_FACE)

        effectPass.swapRenderTarget(last, false)
        gl.useProgram(this.program.target)
        if(this.frame == 0){
            this.frame = this.context.frame
            this.program.uniforms['uFogColor'] = this.color
            this.program.uniforms['uFogRange'] = this.range
            this.program.uniforms['uFogHeight'] = this.height
        }

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        gl.bindTexture(GL.TEXTURE_2D, effectPass.bloom.texture)
        this.program.uniforms['uBloomMask'] = effectPass.bloom.mask

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindVertexArray(effectPass.plane.vao)
        gl.drawElements(GL.TRIANGLES, effectPass.plane.indexCount, GL.UNSIGNED_SHORT, effectPass.plane.indexOffset)
    }
}