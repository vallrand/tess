import { vec2, vec4 } from '../math'
import { createPlane } from '../geometry'
import { Application, System } from '../framework'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { GL, ShaderProgram, UniformSamplerBindings, createTexture } from '../webgl'
import { BloomEffect } from './BloomEffect'
import { DistortionEffect } from './DistortionEffect'
import { DeferredGeometryPass } from './GeometryPass'
import { shaders } from '../shaders'

export interface PostEffect {
    readonly active: boolean
    apply(effectPass: PostEffectPass, last: boolean): void
}

//TODO move into pipeline/effects
class FogEffect implements PostEffect {
    public enabled: boolean = true
    public readonly color: vec4 = vec4(0.2,0.2,0.2,0)
    public readonly range: vec2 = vec2(5,30)
    private readonly program: ShaderProgram
    constructor(private readonly context: Application){
        this.program = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fog_frag, {
            LINEAR_FOG: true, BLOOM: true
        })
        this.program.uniforms['uBloomMap'] = UniformSamplerBindings.uNormalMap
    }
    get active(): boolean { return this.enabled }
    apply(effectPass: PostEffectPass, last: boolean): void {
        const { gl } = this.context

        effectPass.swapRenderTarget(last, false)
        gl.useProgram(this.program.target)
        this.program.uniforms['uFogColor'] = this.color
        this.program.uniforms['uFogRange'] = this.range

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        gl.bindTexture(GL.TEXTURE_2D, effectPass.bloom.texture)
        this.program.uniforms['uBloomMask'] = effectPass.bloom.mask

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.drawElements(GL.TRIANGLES, effectPass.plane.indexCount, GL.UNSIGNED_SHORT, effectPass.plane.indexOffset)
    }
}

export class PostEffectPass implements System {
    public readonly plane: MeshBuffer

    public readonly fbo: WebGLFramebuffer[] = []
    public readonly renderTarget: WebGLTexture[] = []
    public index: number = 0

    public readonly bloom: BloomEffect
    public readonly fog: FogEffect
    public readonly distortion: DistortionEffect

    public readonly effects: PostEffect[] = []
    constructor(private readonly context: Application){
        const gl: WebGL2RenderingContext = context.gl
        const plane = createPlane({ width: 2, height: 2, columns: 1, rows: 1 })
        this.plane = this.context.get(MeshSystem).uploadVertexData(plane.vertexArray, plane.indexArray, plane.format)
        for(let i = 0; i < 2; i++){
            this.fbo[i] = gl.createFramebuffer()
            this.renderTarget[i] = createTexture(gl, {
                width: gl.drawingBufferWidth, height: gl.drawingBufferHeight
            }, { flipY: false, wrap: GL.CLAMP_TO_EDGE, format: GL.RGBA8, mipmaps: GL.NONE, filter: GL.LINEAR })
            gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[i])
            gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.context.get(DeferredGeometryPass).depth)
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTarget[i], 0)
        }

        this.effects.push(
            this.distortion = new DistortionEffect(this.context),
            this.fog = new FogEffect(this.context),
            this.bloom = new BloomEffect(this.context)
        )
    }
    public swapRenderTarget(last: boolean, blit: boolean): void {
        const gl = this.context.gl
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[this.index])
        if(last) gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        else gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[this.index ^= 1])

        if(blit){
            gl.bindFramebuffer(GL.DRAW_FRAMEBUFFER, last ? null : this.fbo[this.index])
            gl.bindFramebuffer(GL.READ_FRAMEBUFFER, this.fbo[last ? this.index : this.index ^ 1])
            gl.blitFramebuffer(
                0,0, gl.drawingBufferWidth, gl.drawingBufferHeight,
                0,0, gl.drawingBufferWidth, gl.drawingBufferHeight,
                GL.COLOR_BUFFER_BIT, GL.NEAREST
            )
        }else if(!last){
            gl.clearColor(0,0,0,0)
            gl.clear(GL.COLOR_BUFFER_BIT)
        }
    }
    public update(): void {
        const { gl } = this.context
        gl.disable(GL.DEPTH_TEST)
        gl.disable(GL.BLEND)
        gl.disable(GL.CULL_FACE)
        gl.bindVertexArray(this.plane.vao)

        let last = 0
        //TODO separate systems for effects?
        while(last < this.effects.length && !this.effects[last].active) last++
        for(let i = this.effects.length - 1; i >= 0; i--)
            if(this.effects[i].active) this.effects[i].apply(this, false)//i === last)
        //TODO refactor, blit is required anyway
        this.swapRenderTarget(true, true)
    }
}