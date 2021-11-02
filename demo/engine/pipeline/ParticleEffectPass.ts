import { range, mat3x2, vec4, mat3, vec3, mat4, insertionSort } from '../math'
import { Application, ISystem } from '../framework'
import { GL, ShaderProgram, UniformBlockBindings } from '../webgl'
import { GeometryBatch, IBatched } from './batch'
import { IEffect, IMesh } from '.'
import { CameraSystem } from '../scene/Camera'
import { DeferredGeometryPass } from './GeometryPass'
import { PipelinePass, IMaterial } from './PipelinePass'
import * as shaders from '../shaders'

export class ParticleEffectPass extends PipelinePass implements ISystem {
    private static readonly orderSort = (a: { order: number }, b: { order: number }) => a.order - b.order
    private static readonly batchSize: number = 1024
    public readonly effects: IEffect[] = []
    private readonly batch: GeometryBatch
    private readonly list: IBatched[] = []
    public readonly program: ShaderProgram
    constructor(context: Application){
        super(context)
        const gl: WebGL2RenderingContext = context.gl
        const maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
        this.batch = new GeometryBatch(gl, ParticleEffectPass.batchSize * 4, ParticleEffectPass.batchSize * 6)
        this.program = ShaderProgram(gl,
            shaders.batch_vert, shaders.batch_frag
            .replace(/^#FOR(.*)$/gm, (match, line) => range(maxTextures).map(i => line.replace(/#i/g,i)).join('\n')), {
            MAX_TEXTURE_UNITS: maxTextures
        })
        this.program.uniforms['uSamplers'] = range(maxTextures)
    }
    public add(...items: (IBatched | IMesh)[]): void {
        this.list.push(...items as any)
    }
    public remove(...items: (IBatched | IMesh)[]): void {
        for(let i = items.length - 1; i >= 0; i--){
            const item = items[i]
            const index = this.list.indexOf(item as any)
            if(index == -1) continue
            this.list[index] = this.list[this.list.length - 1]
            this.list.length--
        }
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
        this.render(this.list)
        this.context.get(DeferredGeometryPass).bindReadBuffer()
        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
    public render(list: Array<IBatched | IMesh>): void {
        const { gl } = this.context
        const camera = this.context.get(CameraSystem).camera

        insertionSort(list, ParticleEffectPass.orderSort)
        let material: IMaterial = null
        for(let i = list.length - 1; i >= 0; i--){
            const item = list[i]
            item.update(this.context, camera)
            if(!camera.culling.cull(item.bounds, 0xFFFF)) continue

            if(!material) if(!(item as IBatched).vertices){
                gl.bindVertexArray(item.buffer.vao)
                gl.useProgram(item.material.program.target)
                item.material.bind(gl)
                item.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
                gl.drawElements(item.buffer.drawMode, item.buffer.indexCount, GL.UNSIGNED_SHORT, item.buffer.indexOffset)
                continue
            }else material = item.material

            if(!material.merge(item.material)) i++
            else if(!this.batch.render(item as IBatched)) i++
            else if(i) continue

            const indexCount = this.batch.indexOffset
            if(indexCount){
                gl.useProgram(material.program.target)
                material.bind(gl)
                this.batch.bind()
                gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
            }
            material = null
        }
    }
}