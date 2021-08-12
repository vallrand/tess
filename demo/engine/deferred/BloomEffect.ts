import { vec2, vec4 } from '../math'
import { Application } from '../framework'
import { GL, ShaderProgram, UniformSamplerBindings, createTexture } from '../webgl'
import { PostEffectPass, PostEffect } from './PostEffectPass'

export class BloomEffect implements PostEffect {
    private static downscale = 4
    private static readonly horizontal = vec2(1, 0)
    private static readonly vertical = vec2(0, 1)

    private readonly brightness: ShaderProgram
    private readonly blur: ShaderProgram

    private readonly width: number
    private readonly height: number
    public enabled: boolean = true

    private readonly fbo: WebGLFramebuffer[] = []
    private readonly renderTarget: WebGLTexture[] = []
    private iterations: number = 2
    public readonly mask: vec4 = vec4(2,2,2,2)
    constructor(private readonly context: Application){
        const gl: WebGL2RenderingContext = context.gl
        this.brightness = ShaderProgram(gl, require('./fullscreen_vert.glsl'), require('../shaders/threshold.glsl'), {
            MASK: true, BRIGHTNESS: false
        })
        this.blur = ShaderProgram(gl, require('./fullscreen_vert.glsl'), require('../shaders/gauss_blur.glsl'), { KERNEL_SIZE: 9 })
        this.width = gl.drawingBufferWidth / BloomEffect.downscale
        this.height = gl.drawingBufferHeight / BloomEffect.downscale

        for(let i = 0; i < 2; i++){
            this.renderTarget[i] = createTexture(gl, {
                width: this.width, height: this.height
            }, {
                flipY: false, wrap: GL.CLAMP_TO_EDGE, format: GL.RGBA8, mipmaps: GL.NONE, filter: GL.LINEAR
            })
            this.fbo[i] = gl.createFramebuffer()
            gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[i])
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTarget[i], 0)
        }
        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
    }
    apply(effectPass: PostEffectPass){
        if(!this.enabled) return
        const gl: WebGL2RenderingContext = this.context.gl
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, effectPass.renderTarget[effectPass.index])
        
        gl.useProgram(this.brightness.target)
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[0])
        gl.viewport(0, 0, this.width, this.height)

        this.context.gl.drawElements(GL.TRIANGLES, effectPass.plane.indexCount, GL.UNSIGNED_SHORT, effectPass.plane.indexOffset)
        
        gl.useProgram(this.blur.target)
        for(let index = 0, i = 0; i < this.iterations; i++){
            gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[index])
            index^=1
            this.blur.uniforms['uSize'] = index ? BloomEffect.horizontal : BloomEffect.vertical
            gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[index])
            this.context.gl.drawElements(GL.TRIANGLES, effectPass.plane.indexCount, GL.UNSIGNED_SHORT, effectPass.plane.indexOffset)
        }
    }
    get texture(): WebGLTexture { return this.enabled ? this.renderTarget[this.iterations & 1] : null }
}