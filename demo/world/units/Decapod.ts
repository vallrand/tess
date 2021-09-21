import { Application } from '../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Decapod extends ControlUnit {
    private static readonly model: string = 'decapod'
    private mesh: Mesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel(Decapod.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.mesh.transform.position)
        modelAnimations[Decapod.model].activate(0, this.mesh.armature)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        const prevPosition = vec3.copy(this.mesh.transform.position, vec3())
        const prevRotation = quat.copy(this.mesh.transform.rotation, quat())
        const nextPosition = vec3(), nextRotation = quat()
        for(let i = 0; i < path.length; i++){
            const prev = i ? path[i - 1] : this.tile
            const next = path[i]
            const rotation = Math.atan2(next[0]-prev[0], next[1]-prev[1])
            quat.axisAngle(vec3.AXIS_Y, rotation, nextRotation)
            this.context.get(TerrainSystem).tilePosition(next[0], next[1], nextPosition)
            vec2.copy(next, this.tile)

            for(const duration = 1.0, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                const t = Math.min(1, elapsedTime / duration)
                vec3.lerp(prevPosition, nextPosition, ease.sineInOut(t), this.mesh.transform.position)
                quat.slerp(prevRotation, nextRotation, ease.quartOut(t), this.mesh.transform.rotation)
                this.mesh.transform.position[1] += 0.5 * ease.fadeInOut(t)
                this.mesh.transform.frame = 0
                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
            vec3.copy(nextPosition, prevPosition)
            quat.copy(nextRotation, prevRotation)
        }
    }
    public *strike(target: vec3): Generator<ActionSignal> {
    }
}