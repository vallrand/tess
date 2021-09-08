import { Application, ISystem } from '../framework'
import { GL, ShaderProgram, UniformBlock } from '../webgl'
import { BoundingVolume, ICamera } from '../scene'
import { MeshBuffer } from '../components/Mesh'

export interface IMesh {
    order: number
    update(context: Application, camera: ICamera): void
    material: IMaterial
    buffer?: MeshBuffer
    uniform?: UniformBlock
    readonly bounds: BoundingVolume
}

export interface IMaterial {
    index?: number
    program?: ShaderProgram
    bind(gl: WebGL2RenderingContext): void
    merge(material: IMaterial): boolean
}

export interface IEffect {
    priority?: number
    enabled: boolean
    apply(): void
}

export abstract class PipelinePass implements ISystem {
    constructor(protected readonly context: Application){}
    public abstract update(): void
}