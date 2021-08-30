import { Application, ISystem } from '../framework'
import { IMaterial } from '../Material'
import { MeshBuffer } from '../Mesh'
import { BoundingVolume, ICamera } from '../scene'
import { UniformBlock } from '../webgl'

export interface IMesh {
    order: number
    update(context: Application, camera: ICamera): void
    material: IMaterial
    buffer?: MeshBuffer
    uniform?: UniformBlock
    readonly bounds: BoundingVolume
}

export abstract class PipelinePass implements ISystem {
    constructor(protected readonly context: Application){}
    public abstract update(): void
}

export interface IEffect {
    priority?: number
    enabled: boolean
    apply(): void
}