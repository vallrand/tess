import { Application } from '../../engine/framework'
import { randomFloat, clamp, lerp, vec2, vec3, vec4, quat, mat4 } from '../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { ParticleEmitter } from '../../engine/particles'
import { TransformSystem } from '../../engine/scene'
import { ParticleEffectPass, DecalPass, Decal } from '../../engine/pipeline'
import { SpriteMaterial } from '../../engine/materials'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, BlendTween, ease } from '../../engine/animation'

import { TerrainSystem } from '../terrain'
import { SharedSystem, ModelAnimation } from '../shared'
import { AISystem, AIUnit, AIStrategyPlan, AIStrategy } from '../military'
import { DeathEffect, DamageEffect } from './effects'
import { StrikeSkill } from './skills/StrikeSkill'

export class Scarab extends AIUnit {
    static readonly pool: Scarab[] = []
    readonly skills = [new StrikeSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 2, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 3, amount: 0, gain: 3 }
    readonly group: number = 2
    readonly movementDuration = 0.4
    
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('scarab')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        Scarab.pool.push(this)
    }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.2,0], ease: ease.quadIn }
            ], BlendTween.vec3),
            'mesh.transform.rotation': PropertyAnimation([
                { frame: 0, value: quat.IDENTITY },
                { frame: 1, value: quat.axisAngle(vec3.AXIS_X, 0.04 * Math.PI, quat()), ease: ease.sineIn }
            ], BlendTween.quat)
        })

        for(const generator = this.moveAlongPath(path, frames, true); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }
    }
}