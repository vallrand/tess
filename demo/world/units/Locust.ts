import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger, BlendTween } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Locust extends ControlUnit {
    private static readonly model: string = 'locust'
    public readonly size: vec2 = vec2(2,2)
    private mesh: Mesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Locust.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Locust.model].activate(0, this.mesh.armature)


    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        const floatDuration = 0.8, floatHeight = 0.0
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const time = clamp(Math.min(duration-elapsedTime,elapsedTime),0,floatDuration)

            this.mesh.transform.position[1] += floatHeight * ease.quadOut(time / floatDuration)

            if(iterator.done) break
            else yield iterator.value
        }
    }
    public *strike(target: vec3): Generator<ActionSignal> {
    }
}