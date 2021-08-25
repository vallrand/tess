import { Application } from '../framework'
import { PostEffectPass, PostEffect } from './PostEffectPass'
import { GL, createTexture, ShaderProgram } from '../webgl'
import { GeometryBatch, IBatched } from '../batch'
import { ParticleEffectPass } from './ParticleEffectPass'
import { CameraSystem } from '../Camera'

export class DistortionEffect implements PostEffect {
    private static downscale: number = 4
    private readonly width: number
    private readonly height: number
    private readonly renderTarget: WebGLTexture
    private readonly fbo: WebGLFramebuffer
    private readonly program: ShaderProgram
    private readonly batch: GeometryBatch
    private readonly list: IBatched[] = []
    public enabled: boolean = true
    constructor(private readonly context: Application){
        const { gl } = this.context
        this.program = this.context.get<any>(ParticleEffectPass).program
        this.batch = this.context.get<any>(ParticleEffectPass).batch

        this.width = gl.drawingBufferWidth / DistortionEffect.downscale
        this.height = gl.drawingBufferHeight / DistortionEffect.downscale

        this.renderTarget = createTexture(gl, {
            width: this.width, height: this.height
        }, {
            flipY: false, wrap: GL.CLAMP_TO_EDGE, format: GL.RGBA8, mipmaps: GL.NONE, filter: GL.LINEAR
        })
        this.fbo = gl.createFramebuffer()
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTarget, 0)
        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
    }
    get texture(): WebGLTexture { return this.enabled ? this.renderTarget : null }
    apply(effectPass: PostEffectPass){
        if(!this.enabled || !this.list.length) return
        const { gl } = this.context

        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo)
        gl.viewport(0, 0, this.width, this.height)
        gl.useProgram(this.program.target)

        // gl.cullFace(GL.BACK)
        // gl.enable(GL.CULL_FACE)
        // gl.depthFunc(GL.LEQUAL)
        // gl.enable(GL.DEPTH_TEST)
        // gl.enable(GL.BLEND)
        // gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        const camera = this.context.get(CameraSystem).camera
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            item.recalculate(this.context.frame, camera)
            if(!camera.culling.cull(item.bounds)) continue

            const flush = this.batch.render(item)
            if(flush && i) continue
            if(this.batch.indexOffset){
                const indexCount = this.batch.indexOffset
                this.batch.bind()
                gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
            }
            if(!flush) i++
        }
    }
}