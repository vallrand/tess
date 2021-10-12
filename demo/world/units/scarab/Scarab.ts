import { Application } from '../../../engine/framework'
import { random, randomFloat, clamp, lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { ParticleEmitter } from '../../../engine/particles'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass, DecalPass, Decal } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, BlendTween, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIStrategyPlan, CloseCombatStrategy } from '../../opponent'
import { DeathEffect } from '../common'
import { StrikeSkill } from './StrikeSkill'

export class Scarab extends AIUnit {
    readonly skills = [new StrikeSkill(this.context)]
    readonly gainMovementPoints = 3
    readonly gainActionPoints = 1
    readonly movementDuration = 0.4
    private readonly deathEffect = new DeathEffect(this.context)
    
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('scarab')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)

        this.context.get(TerrainSystem).setTile(column, row, this as any)
        //this.actionIndex = this.context.get(AnimationSystem).start(this.appear(), true)
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public strategy(): AIStrategyPlan {
        return CloseCombatStrategy(this.context, this, 0)
    }

    private dust: ParticleEmitter
    // public *appear(): Generator<ActionSignal> {
    //     const origin = vec3.copy(this.mesh.transform.position, vec3())

    //     this.dust = SharedSystem.particles.dust.add({
    //         uLifespan: [0.6,0.8,-0.2,0],
    //         uOrigin: origin,
    //         uGravity: vec3.ZERO,
    //         uOrientation: quat.IDENTITY,
    //         uRadius: [0,0.5],
    //         uSize: [1,4],
    //         uRotation: [0,2*Math.PI],
    //         uTarget: vec3.add(origin, [0, -0.5, 0], vec3()),
    //         uForce: [2,4],
    //         uAngular: [-Math.PI,Math.PI,0,0]
    //     })
    //     const animate = AnimationTimeline(this, {
    //         'dust': EventTrigger([{ frame: 0, value: 16 }], EventTrigger.emit),
    //         'mesh.transform.position': PropertyAnimation([
    //             { frame: 0, value: vec3.add(origin, [0,-1,0], vec3()) },
    //             { frame: 1, value: origin, ease: ease.quadOut }
    //         ], vec3.lerp)
    //     })

    //     for(const duration = 1, startTime = this.context.currentTime; true;){
    //         const elapsedTime = this.context.currentTime - startTime
    //         animate(elapsedTime, this.context.deltaTime)
    //         if(elapsedTime > duration) break
    //         yield ActionSignal.WaitNextFrame
    //     }

    //     SharedSystem.particles.dust.remove(this.dust)
    // }
    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        return this.deathEffect.use(this)
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