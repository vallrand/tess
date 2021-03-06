import { createPlane } from '../geometry'
import { Application, ISystem } from '../framework'
import { MeshSystem, MeshBuffer } from '../components/Mesh'
import { GL, UniformSamplerBindings, createTexture } from '../webgl'
import { DeferredGeometryPass } from './GeometryPass'
import { ParticleEffectPass } from './ParticleEffectPass'
import { FogEffect, BloomEffect } from './effects'
import { PipelinePass, IMaterial } from './PipelinePass'

export interface IPostEffect {
    readonly active: boolean
    apply(effectPass: PostEffectPass, last: boolean): void
}

export class PostEffectPass extends PipelinePass implements ISystem {
    public readonly plane: MeshBuffer

    public readonly fbo: WebGLFramebuffer[] = []
    public readonly renderTarget: WebGLTexture[] = []
    public index: number = 0

    public readonly bloom: BloomEffect
    public readonly fog: FogEffect

    public readonly list: any[] = []
    public readonly effects: IPostEffect[] = []
    constructor(context: Application){
        super(context)
        const gl: WebGL2RenderingContext = context.gl
        const plane = createPlane({ width: 2, height: -2, columns: 1, rows: 1 })
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
        gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight)

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
    add(item: any){
        this.list.push(item)
    }
    remove(item: any){
        const index = this.list.indexOf(item)
        if(index != -1) this.list.splice(index, 1)
    }
    public update(): void {
        const { gl } = this.context

        if(this.list.length){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uAlbedoBuffer)
            gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[this.index])
            this.swapRenderTarget(false, true)

            gl.disable(GL.BLEND)
            gl.disable(GL.CULL_FACE)
            gl.depthFunc(GL.LEQUAL)
            gl.enable(GL.DEPTH_TEST)

            this.context.get(ParticleEffectPass).render(this.list)
        }

        for(let i = this.effects.length - 1; i >= 0; i--)
            if(this.effects[i].active) this.effects[i].apply(this, false)
        this.swapRenderTarget(true, true)
    }
}