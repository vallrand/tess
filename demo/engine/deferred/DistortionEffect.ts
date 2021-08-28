import { Application } from '../framework'
import { PostEffectPass, PostEffect } from './PostEffectPass'
import { GL, createTexture, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { GeometryBatch, IBatched } from '../batch'
import { ParticleEffectPass } from './ParticleEffectPass'
import { CameraSystem } from '../Camera'
import { DeferredGeometryPass } from './GeometryPass'
import { shaders } from '../shaders'
import { SpriteMaterial } from '../Sprite'

export class DistortionEffect implements PostEffect {
    private readonly program: ShaderProgram
    private readonly batch: GeometryBatch
    private readonly list: IBatched[] = []
    public enabled: boolean = true
    constructor(private readonly context: Application){
        const { gl } = this.context
        this.program = ShaderProgram(gl, shaders.batch_vert, shaders.distortion_frag, {})
        this.batch = this.context.get<any>(ParticleEffectPass).batch
    }
    public add(item: IBatched){
        this.list.push(item)
    }
    public remove(item: IBatched){
        const index = this.list.indexOf(item)
        if(index != -1) this.list.splice(index, 1)
    }
    get active(): boolean { return this.list.length && this.enabled }
    apply(effectPass: PostEffectPass, last: boolean){
        const { gl } = this.context
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uAlbedoBuffer)
        gl.bindTexture(GL.TEXTURE_2D, effectPass.renderTarget[effectPass.index])
        effectPass.swapRenderTarget(last, true)

        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.DEPTH_TEST)

        const camera = this.context.get(CameraSystem).camera
        let material: SpriteMaterial = null
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            item.recalculate(this.context.frame, camera)
            if(!camera.culling.cull(item.bounds)) continue

            if(!material) material = item.material as any
            if(material.diffuse !== item.material.diffuse || material.program !== item.material.program) i++
            else if(!this.batch.render(item)) i++
            else if(i) continue

            const { diffuse, program = this.program } = material
            material = null
            const indexCount = this.batch.indexOffset
            if(!indexCount) continue

            this.batch.bind()
            gl.useProgram(program.target)
            gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
        }
    }
}