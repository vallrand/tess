import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, shortestAngle } from '../../../engine/math'
import { ShaderProgram } from '../../../engine/webgl'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { DecalMaterial, SpriteMaterial, ShaderMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { doubleSided } from '../../../engine/geometry'
import { shaders } from '../../../engine/shaders'
import { ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit, AIStrategyPlan, CloseCombatStrategy } from '../../opponent'
import { DeathEffect } from '../common'
import { ShockwaveSkill } from './ShockwaveSkill'
import { TurretSkill } from './TurretSkill'
import { SpawnerSkill } from './SpawnerSkill'

export class Monolith extends AIUnit {
    public readonly size: vec2 = vec2(3,3)
    readonly skills = [new TurretSkill(this.context),new SpawnerSkill(this.context),new ShockwaveSkill(this.context)]
    private readonly deathEffect = new DeathEffect(this.context)
    readonly movementDuration: number = 1

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel("monolith")
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)
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

    private glow: BatchMesh
    private light: PointLight
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.glow = new BatchMesh(SharedSystem.geometry.openBox)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem).create()
        this.glow.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.glow)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        this.light.transform.parent = this.mesh.transform
        vec3.set(0,2,0, this.light.transform.position)

        const animate = AnimationTimeline(this, {
            'glow.transform.scale': PropertyAnimation([
                { frame: 0, value: [6,0,6] },
                { frame: 1, value: [6,3,6], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5,1] },
                { frame: 0.5, value: [0.5,0.7,1,0.2], ease: ease.sineIn }
            ], vec4.lerp),
            'light.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5] },
                { frame: 0.5, value: [0.5,0.7,1], ease: ease.sineIn }
            ], vec3.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 6, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 8, ease: ease.sineOut }
            ], lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.2,0], ease: ease.sineInOut }
            ], BlendTween.vec3)
        })

        for(const generator = this.moveAlongPath(path, frames, false); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.glow)
    }
}