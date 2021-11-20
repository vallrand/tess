import { vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'
import { ParticleEmitter } from '../../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'mesh.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.4, value: [0.8,0,0.6,1], ease: ease.cubicOut },
        { frame: 2.0, value: vec4.ONE, ease: ease.sineIn }
    ], vec4.lerp),
    'pulse.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 2.0, value: [16,16,16], ease: ease.quadOut }
    ], vec3.lerp),
    'pulse.color': PropertyAnimation([
        { frame: 1.4, value: vec4.ONE },
        { frame: 2.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),

    'core.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.3, value: [2.6,2.6,2.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0.8, value: [0.4,1,0.8,1] },
        { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'sparkle.transform.scale': PropertyAnimation([
        { frame: 0.7, value: vec3.ZERO },
        { frame: 0.9, value: [6,2,2], ease: ease.cubicOut }
    ], vec3.lerp),
    'sparkle.color': PropertyAnimation([
        { frame: 0.7, value: [0.6,1,1,0] },
        { frame: 0.9, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [8,8,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.5,1,1,0.4] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'cylinder.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [0,8,0] },
        { frame: 1.2, value: [2.4,5,2.4], ease: ease.quadOut }
    ], vec3.lerp),
    'cylinder.color': PropertyAnimation([
        { frame: 0.4, value: [0.4,0.8,1,1] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'speedlines': EventTrigger([
        { frame: 0, value: 32 }
    ], EventTrigger.emit),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [0,0,10] },
        { frame: 1.6, value: [3,3,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0.4, value: [0.2,0.8,1,0] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [5,5,5], ease: ease.quartOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.8, value: [1,0.8,1,0.6] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

export class ShockwaveSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 5
    readonly cardinal: boolean = false
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Electric | DamageType.Temperature |
    DamageType.Corrosion | DamageType.Kinetic | DamageType.Immobilize
    readonly damage: number = 1

    private pulse: Mesh
    private ring: Sprite
    private cylinder: BatchMesh
    private speedlines: ParticleEmitter
    private cone: BatchMesh
    private flash: Sprite
    private core: BatchMesh
    private sparkle: Sprite
    private mesh: Mesh

    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        this.pulse = Mesh.create(SharedSystem.geometry.sphereMesh, 1)
        this.pulse.material = SharedSystem.materials.pulseMaterial
        this.pulse.transform = this.context.get(TransformSystem)
        .create([0,6,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.pulse)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,4,0],quat.HALF_X,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.effect.energyHalfPurple
        this.cylinder.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.speedlines = SharedSystem.particles.energy.add({
            uLifespan: [0.6,1,-0.2,0],
            uOrigin: mat4.transform(vec3.ZERO, this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO,
            uGravity: [0,8,0],
            uSize: [0.2,0.6],
            uRadius: [3,5],
            uForce: vec2.ZERO,
            uTarget: [0,5,0]
        })

        this.cone = BatchMesh.create(SharedSystem.geometry.hemisphere)
        this.cone.material = SharedSystem.materials.effect.absorbTeal
        this.cone.transform = this.context.get(TransformSystem)
        .create([0,2.5,0],quat.HALF_X,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.flash = Sprite.create(BillboardType.Sphere)
        this.flash.material = SharedSystem.materials.sprite.halo
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,5,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.core = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.core.material = SharedSystem.materials.effect.energyPurple
        this.core.transform = this.context.get(TransformSystem)
        .create([0,4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        this.sparkle = Sprite.create(BillboardType.Sphere)
        this.sparkle.material = SharedSystem.materials.sprite.sparkle
        this.sparkle.transform = this.context.get(TransformSystem)
        .create([0,5.4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.sparkle)

        const damage = EventTrigger([{ frame: 1.0, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, actionTimeline)
        this.context.get(AudioSystem).create(`assets/wave_use.mp3`, 'sfx', this.mesh.transform).play(0.2)
        for(const duration = 3.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.sparkle.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.pulse.transform)
        SharedSystem.particles.energy.remove(this.speedlines)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.sparkle)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(PostEffectPass).remove(this.pulse)
        Sprite.delete(this.sparkle)
        Sprite.delete(this.flash)
        Sprite.delete(this.ring)
        BatchMesh.delete(this.cylinder)
        BatchMesh.delete(this.cone)
        BatchMesh.delete(this.core)
    }
}