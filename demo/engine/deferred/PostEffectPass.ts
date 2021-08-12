import { vec4 } from '../math'
import { createPlane } from '../geometry'
import { Application, System } from '../framework'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { GL, ShaderProgram, UniformSamplerBindings, createTexture } from '../webgl'
import { BloomEffect } from './BloomEffect'
import { DeferredGeometryPass } from './GeometryPass'

export interface PostEffect {
    apply(effectPass: PostEffectPass): void
}

export class PostEffectPass implements System {
    public readonly plane: MeshBuffer
    public readonly blit: ShaderProgram

    public readonly fbo: WebGLFramebuffer[] = []
    public readonly renderTarget: WebGLTexture[] = []
    public index: number = 0

    private readonly program: ShaderProgram
    private readonly bloom: BloomEffect
    public readonly fog = {
        color: vec4(0.2,0.2,0.2,0),
        range: [5,30]
    }
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
        this.blit = ShaderProgram(gl, require('./fullscreen_vert.glsl'), require('../shaders/blit.glsl'))
        this.program = ShaderProgram(gl, require('./fullscreen_vert.glsl'), require('./post_frag.glsl'), {
            LINEAR_FOG: true
        })
        this.program.uniforms['uBloomMap'] = UniformSamplerBindings.uNormalMap
        this.bloom = new BloomEffect(this.context)
    }
    public swapRenderTarget(): void {
        const gl = this.context.gl
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[this.index])
        this.index ^= 1
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[this.index])
        gl.clear(GL.COLOR_BUFFER_BIT)
    }
    public update(): void {
        const gl: WebGL2RenderingContext = this.context.gl
        gl.disable(GL.DEPTH_TEST)
        gl.disable(GL.BLEND)
        gl.disable(GL.CULL_FACE)
        gl.bindVertexArray(this.plane.vao)

        this.bloom.apply(this)

        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        gl.useProgram(this.program.target)

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[this.index])

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        gl.bindTexture(GL.TEXTURE_2D, this.bloom.texture)

        this.program.uniforms['uFogColor'] = this.fog.color
        this.program.uniforms['uFogRange'] = this.fog.range
        this.program.uniforms['uBloomMask'] = this.bloom.mask

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.drawElements(GL.TRIANGLES, this.plane.indexCount, GL.UNSIGNED_SHORT, this.plane.indexOffset)
    }
}