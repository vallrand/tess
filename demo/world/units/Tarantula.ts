import { vec2, vec3 } from '../../engine/math'
import { MeshSystem } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, ease } from '../../engine/animation'

import { ModelAnimation } from '../shared'
import { AIUnit, AIStrategy } from '../military'
import { Spider4Rig } from './effects/Spider4Rig'
import { WaveSkill } from './skills/WaveSkill'
import { ProjectileSkill } from './skills/ProjectileSkill'

export class Tarantula extends AIUnit {
    static readonly pool: Tarantula[] = []
    readonly skills = [new WaveSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 4, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 1 }
    readonly group: number = 2
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('tarantula')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Tarantula.pool.push(this)
    }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.5,0], ease: ease.sineOut }
            ], BlendTween.vec3)
        })

        for(const generator = this.moveAlongPath(path, frames, false); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }
    }
}

export class TarantulaVariant extends AIUnit {
    static readonly pool: TarantulaVariant[] = []
    readonly skills = [new ProjectileSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 4, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 0.5 }
    readonly movement = { capacity: 1, amount: 0, gain: 1 }
    readonly group: number = 2
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('tarantula')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activateVariant')(0, this.mesh.armature)
        this.markTiles(true)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        TarantulaVariant.pool.push(this)
    }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.5,0], ease: ease.sineOut }
            ], BlendTween.vec3)
        })

        for(const generator = this.moveAlongPath(path, frames, false); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }
    }
}