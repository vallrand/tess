import { Application } from '../../../engine/framework'
import { random, clamp, lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { MeshSystem, Mesh, ArmatureNode, Sprite, BillboardType, BatchMesh, Line } from '../../../engine/components'
import { MeshMaterial, SpriteMaterial, DecalMaterial } from '../../../engine/materials'
import { TransformSystem } from '../../../engine/scene'
import { applyTransform, doubleSided } from '../../../engine/geometry'
import { ParticleEmitter } from '../../../engine/particles'
import { DeferredGeometryPass, PointLightPass, PointLight, DecalPass, Decal, ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIStrategyPlan, CloseCombatStrategy } from '../../opponent'
import { DeathEffect } from '../common'
import { Spider4Rig } from './Spider4Rig'
import { WaveSkill } from './WaveSkill'
import { ProjectileSkill } from './ProjectileSkill'

export class Tarantula extends AIUnit {
    readonly skills = [new WaveSkill(this.context)]
    private readonly deathEffect = new DeathEffect(this.context)
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('tarantula')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public strategy(): AIStrategyPlan { return CloseCombatStrategy(this.context, this, 0) }

    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        return this.deathEffect.use(this)
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
    readonly skills = [new ProjectileSkill(this.context)]
    private readonly deathEffect = new DeathEffect(this.context)
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('tarantula')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activateVariant(0, this.mesh.armature)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }

    public strategy(): AIStrategyPlan { return CloseCombatStrategy(this.context, this, 0) }

    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        return this.deathEffect.use(this)
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