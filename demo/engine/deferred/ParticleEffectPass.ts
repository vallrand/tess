import { range, mat3x2, vec4, mat3, vec3 } from '../math'
import { Application, System } from '../framework'
import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { PostEffectPass } from './PostEffectPass'
import { RenderTexture } from '../Material'
import { GeometryBatch, IBatched, Sprite, Line } from '../batch'
import { IEffect } from '../pipeline'
import { CameraSystem } from '../Camera'

export class ParticleEffectPass implements System {
    private static readonly batchSize: number = 1024
    public readonly effects: IEffect[] = []
    private readonly batch: GeometryBatch
    public readonly list: IBatched[] = []
    private readonly program: ShaderProgram
    constructor(private readonly context: Application){
        const gl: WebGL2RenderingContext = context.gl
        const maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
        this.batch = new GeometryBatch(gl, ParticleEffectPass.batchSize * 4, ParticleEffectPass.batchSize * 6)
        this.program = ShaderProgram(gl,
            require('../shaders/batch_vert.glsl'), require('../shaders/batch_frag.glsl')
            .replace(/^#FOR(.*)$/gm, (match, line) => range(maxTextures).map(i => line.replace(/#i/g,i)).join('\n')), {
            MAX_TEXTURE_UNITS: maxTextures
        })
        this.program.uniforms['uSamplers'] = range(maxTextures)
    }
    public addSprite(): Sprite {
        const sprite = new Sprite()
        this.list.push(sprite)
        return sprite
    }
    public add(batched: IBatched): void {

    }
    public remove(batched: IBatched): void {
        const index = this.list.indexOf(batched)
        this.list.splice(index, 1)
    }
    private sort(list: IBatched[], origin: vec3): void {
        for(let length = list.length, j, i = 0; i < length; i++){
            let temp = list[i]
            //calc distance to camera
            for(j = i - 1; j >= 0 && temp.order > list[j].order; j--)
                list[j+1] = list[j]
            list[j+1] = temp
        }
    }
    public update(): void {
        const { gl } = this.context

        gl.cullFace(GL.BACK)
        gl.enable(GL.CULL_FACE)
        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.DEPTH_TEST)
        gl.enable(GL.BLEND)
        gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        const camera = this.context.get(CameraSystem).camera
        //this.sort(this.list, camera.transform.position)
        let program: ShaderProgram = this.list[this.list.length - 1]?.material.program || this.program
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            item.recalculate(this.context.frame, camera)
            
            const itemProgram = item.material.program || this.program
            if(itemProgram === program && this.batch.render(item) && i) continue
            if(this.batch.indexOffset){
                gl.useProgram(program.target)
                const indexCount = this.batch.indexOffset
                this.batch.bind()
                gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
            }
            if(i) i++
            program = itemProgram
        }
        //this.context.get(PostEffectPass).swapRenderTarget()

        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
}