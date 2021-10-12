import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat } from '../../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { TransformSystem, Transform } from '../../../engine/scene'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { DecalMaterial, SpriteMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIStrategyPlan, CloseCombatStrategy } from '../../opponent'
import { OrbSkill } from './OrbSkill'
import { DeathEffect } from '../common'

export class Isopod extends AIUnit {
    readonly skills = [new OrbSkill(this.context)]
    private readonly deathEffect = new DeathEffect(this.context)
    readonly movementDuration: number = 0.4

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel("isopod")
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uLifespan: [0.6,1.2,0,0], uSize: [2,4],
            uRadius: [0,0.2], uOrientation: quat.IDENTITY,
            uForce: [2,5], uTarget: vec3.ZERO, uGravity: vec3.ZERO,
            uRotation: [0, 2 * Math.PI], uAngular: [-Math.PI,Math.PI,0,0]
        })
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        SharedSystem.particles.dust.remove(this.dust)
    }
    public strategy(): AIStrategyPlan { return CloseCombatStrategy(this.context, this, 0) }

    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        return this.deathEffect.use(this)
    }

    private dust: ParticleEmitter
    private shadow: Decal
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.shadow = this.context.get(DecalPass).create(4)
        this.shadow.transform = this.context.get(TransformSystem).create()
        this.shadow.transform.parent = this.mesh.transform
        this.shadow.material = new DecalMaterial()
        this.shadow.material.program = this.context.get(DecalPass).program
        this.shadow.material.diffuse = SharedSystem.textures.glow

        this.context.get(TerrainSystem).tilePosition(path[path.length - 1][0], path[path.length - 1][1], this.dust.uniform.uniforms['uOrigin'] as any)
        vec3.copy(this.dust.uniform.uniforms['uOrigin'] as any, this.dust.uniform.uniforms['uTarget'] as any)

        const animate = AnimationTimeline(this, {
            'shadow.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'shadow.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.6,1,0.4] }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,1,0], ease: ease.quartOut }
            ], BlendTween.vec3)
        })
        
        const duration = frames[frames.length - 1]
        const dustEmit = EventTrigger([{ frame: duration - 0.1, value: 16 }], EventTrigger.emit)

        for(const generator = this.moveAlongPath(path, frames, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            animate(this.movementFloat, this.context.deltaTime)
            dustEmit(elapsedTime, this.context.deltaTime, this.dust)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.shadow.transform)
        this.context.get(DecalPass).delete(this.shadow)
    }
}