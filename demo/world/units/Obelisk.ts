import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4 } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { ParticleEffectPass, PointLight, PointLightPass } from '../../engine/pipeline'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, ease } from '../../engine/animation'

import { TerrainSystem } from '../terrain'
import { SharedSystem, ModelAnimation } from '../shared'
import { AISystem, AIUnit, AIStrategyPlan, AIStrategy } from '../military'
import { DeathEffect, DamageEffect } from './effects'
import { BeamSkill } from './skills/BeamSkill'

export class Obelisk extends AIUnit {
    static readonly pool: Obelisk[] = []
    readonly skills = [new BeamSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 10, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 1 }
    readonly group: number = 2
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel("obelisk")
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        Obelisk.pool.push(this)
    }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        if(this.skills[0].active) for(const generator = this.skills[0].deactivate(); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }

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