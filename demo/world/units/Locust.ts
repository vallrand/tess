import { Application } from '../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Locust extends ControlUnit {
    private static readonly model: string = 'locust'
    private mesh: Mesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel(Locust.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.mesh.transform.position)
        modelAnimations[Locust.model].activate(0, this.mesh.armature)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {

    }
    public *strike(target: vec3): Generator<ActionSignal> {
    }
}