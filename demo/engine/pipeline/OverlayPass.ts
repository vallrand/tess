import { range, mat3x2, vec4, mat3, insertionSort } from '../math'
import { Application, ISystem } from '../framework'
import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import * as shaders from '../shaders'
import { Batch2D, IBatched2D } from './batch'
import { PipelinePass, IMaterial } from './PipelinePass'

export class OverlayPass extends PipelinePass implements ISystem {
    private static readonly orderSort = (a: { order: number }, b: { order: number }) => a.order - b.order
    private static readonly batchSize: number = 1024
    private readonly list: IBatched2D[] = []
    public readonly program: ShaderProgram
    public readonly batch: Batch2D
    private readonly projectionMatrix: mat3 = mat3()
    constructor(context: Application){
        super(context)
        const maxTextures = context.gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
        this.program = ShaderProgram(context.gl, shaders.batch2d_vert, shaders.batch2d_frag
            .replace(/^#FOR(.*)$/gm, (match, line) => range(maxTextures).map(i => line.replace(/#i/g,i)).join('\n')),
            { MAX_TEXTURE_UNITS: maxTextures })
        this.program.uniforms['uSamplers'] = range(maxTextures)
        this.batch = new Batch2D(this.context.gl, 4*OverlayPass.batchSize, 6*OverlayPass.batchSize, null)

        const projection = mat3x2.orthogonal(0, context.gl.drawingBufferWidth, 0, context.gl.drawingBufferHeight, mat3x2())
        mat3.fromMat3x2(projection, this.projectionMatrix)
    }
    public add(item: IBatched2D): void { this.list.push(item) }
    public remove(item: IBatched2D): void {
        const index = this.list.indexOf(item)
        if(index === - 1) return
        else if(index === this.list.length - 1) this.list.length--
        else this.list[index] = this.list.pop()
    }
    public update(): void {
        const { gl } = this.context
        insertionSort(this.list, OverlayPass.orderSort)
        let material: IMaterial = null
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            item.update(this.context.frame)

            if(!material) material = item.material
            if(!material.merge(item.material)) i++
            else if(!this.batch.render(item)) i++
            else if(i) continue

            const indexCount = this.batch.indexOffset
            if(indexCount){
                gl.useProgram(material.program.target)
                material.program.uniforms['uProjectionMatrix'] = this.projectionMatrix
                material.bind(gl)
                this.batch.bind()
                gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
            }
            material = null
        }
        gl.disable(GL.BLEND)
    }
}