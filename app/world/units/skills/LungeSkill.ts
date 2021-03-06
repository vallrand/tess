import { vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ParticleEmitter } from '../../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEffectPass } from '../../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'cone.transform.position': PropertyAnimation([
        { frame: 0.7, value: [0,1.5,0.5] },
        { frame: 1.1, value: [0,1.3,3.5], ease: ease.quintOut }
    ], vec3.lerp),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [1.5,6,1.5] },
        { frame: 1.1, value: [1,0.8,1], ease: ease.quadOut }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0.7, value: vec4.ZERO },
        { frame: 0.8, value: [0.6,0.7,0.9,0.4], ease: ease.quartOut },
        { frame: 1.1, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),

    'spikesLeft': EventTrigger([{ frame: 0.16, value: 24 }], EventTrigger.emit),
    'spikesRight': EventTrigger([{ frame: 0.16, value: 24 }], EventTrigger.emit),
    'sparksLeft': EventTrigger([{ frame: 0.8, value: 36 }], EventTrigger.emit),
    'sparksRight': EventTrigger([{ frame: 0.8, value: 36 }], EventTrigger.emit),
    'wave.transform.scale': PropertyAnimation([
        { frame: 1.0, value: [1,0,0] },
        { frame: 1.7, value: [2,2,1.5], ease: ease.sineOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 1.0, value: [0.4,0.2,1,1] },
        { frame: 1.7, value: vec4.ZERO, ease: ease.sineInOut }
    ], vec4.lerp),
    'tubeLeft.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [2.4,0,2.4] },
        { frame: 1.0, value: [0.6,2,0.6], ease: ease.quadOut },
        { frame: 1.6, value: [0,2,0], ease: ease.sineIn }
    ], vec3.lerp),
    'tubeRight.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [2.4,0,2.4] },
        { frame: 1.0, value: [0.6,2,0.6], ease: ease.quadOut },
        { frame: 1.6, value: [0,2,0], ease: ease.sineIn }
    ], vec3.lerp),
    'tubeLeft.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.6, value: [0.4,0,0.6,1], ease: ease.quadIn }
    ], vec4.lerp),
    'tubeRight.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.6, value: [0.4,0,0.6,1], ease: ease.quadIn }
    ], vec4.lerp),
    'beamLeft.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.2, value: [1.6,4.8,1.6], ease: ease.expoOut }
    ], vec3.lerp),
    'beamRight.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.2, value: [1.6,4.8,1.6], ease: ease.expoOut }
    ], vec3.lerp),
    'beamLeft.color': PropertyAnimation([
        { frame: 0.8, value: [0.7,0.9,1,0] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'beamRight.color': PropertyAnimation([
        { frame: 0.8, value: [0.7,0.9,1,0] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'ringLeft.transform.scale': PropertyAnimation([
        { frame: 0.9, value: vec3.ZERO },
        { frame: 1.3, value: [2,2,2], ease: ease.quartOut }
    ], vec3.lerp),
    'ringRight.transform.scale': PropertyAnimation([
        { frame: 0.9, value: vec3.ZERO },
        { frame: 1.3, value: [2,2,2], ease: ease.quartOut }
    ], vec3.lerp),
    'ringLeft.color': PropertyAnimation([
        { frame: 0.9, value: [0.4,0.6,1,0.2] },
        { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'ringRight.color': PropertyAnimation([
        { frame: 0.9, value: [0.4,0.6,1,0.2] },
        { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

export class LungeSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 2
    readonly cardinal: boolean = false
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Kinetic
    readonly damage: number = 2

    private spikesLeft: ParticleEmitter
    private spikesRight: ParticleEmitter
    private tubeLeft: BatchMesh
    private tubeRight: BatchMesh
    private beamLeft: Sprite
    private beamRight: Sprite
    private ringLeft: Sprite
    private ringRight: Sprite
    private sparksLeft: ParticleEmitter
    private sparksRight: ParticleEmitter
    private wave: BatchMesh
    private cone: BatchMesh
    private mesh: Mesh
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        for(const generator = source.rotate(target); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }

        this.mesh = source.mesh
        this.spikesLeft = SharedSystem.particles.energy.add({
            uLifespan: [0.8,1.2,0,0],
            uOrigin: mat4.transform(vec3(0.5,1.5,-0.5), this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.4,1.2], uRadius: [0.5,1.5], uForce: [6,8],
            uTarget: mat4.transformNormal(vec3(0,-0.5,3.5), this.mesh.transform.matrix, vec3())
        })
        this.spikesRight = SharedSystem.particles.energy.add({
            uLifespan: [0.8,1.2,0,0],
            uOrigin: mat4.transform(vec3(-0.5,1.5,-0.5), this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.4,1.2], uRadius: [0.5,1.5], uForce: [6,8],
            uTarget: mat4.transformNormal(vec3(0,-0.5,3.5), this.mesh.transform.matrix, vec3())
        })
    
        this.tubeLeft = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.tubeRight = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.tubeLeft.material = SharedSystem.materials.effect.absorbTeal
        this.tubeRight.material = SharedSystem.materials.effect.absorbTeal
        this.tubeLeft.transform = this.context.get(TransformSystem)
        .create([0.5,1.3,1.2], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.tubeRight.transform = this.context.get(TransformSystem)
        .create([-0.5,1.3,1.2], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.tubeLeft)
        this.context.get(ParticleEffectPass).add(this.tubeRight)
    
    
        this.beamLeft = Sprite.create(BillboardType.Cylinder, 4)
        this.beamRight = Sprite.create(BillboardType.Cylinder, 4)
        this.beamLeft.material = SharedSystem.materials.sprite.sparkle
        this.beamRight.material = SharedSystem.materials.sprite.sparkle
        this.beamLeft.transform = this.context.get(TransformSystem)
        .create([-0.5,1.3,3], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.beamRight.transform = this.context.get(TransformSystem)
        .create([0.5,1.3,3], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beamLeft)
        this.context.get(ParticleEffectPass).add(this.beamRight)
    
    
        this.ringLeft = Sprite.create(BillboardType.Sphere, 4)
        this.ringRight = Sprite.create(BillboardType.Sphere, 4)
        this.ringLeft.material = SharedSystem.materials.sprite.burst
        this.ringRight.material = SharedSystem.materials.sprite.burst
    
        this.ringLeft.transform = this.context.get(TransformSystem)
        .create([-0.5,1.3,3], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.ringRight.transform = this.context.get(TransformSystem)
        .create([0.5,1.3,3], quat.IDENTITY, vec3.ONE, this.mesh.transform)
    
        this.context.get(ParticleEffectPass).add(this.ringLeft)
        this.context.get(ParticleEffectPass).add(this.ringRight)
    
        this.sparksLeft = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(-0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: vec3.ZERO,
        })
        this.sparksRight = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: vec3.ZERO,
        })
    
        this.wave = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.wave.material = SharedSystem.materials.effect.stripes
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3(0,1.3,3), quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)
    
        this.context.get(ParticleEffectPass).add(this.wave)
    
        this.cone = BatchMesh.create(SharedSystem.geometry.cone)
        this.cone.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.HALF_X, vec3.ONE, this.mesh.transform)
    
        this.cone.material = SharedSystem.materials.sprite.streak
        this.context.get(ParticleEffectPass).add(this.cone)
    
        const damage = EventTrigger([{ frame: 0.6, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, actionTimeline)
        this.context.get(AudioSystem).create(`assets/lunge_use.mp3`, 'sfx', this.mesh.transform).play(0.25)
    
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    
        SharedSystem.particles.energy.remove(this.spikesLeft)
        SharedSystem.particles.energy.remove(this.spikesRight)
        SharedSystem.particles.sparks.remove(this.sparksLeft)
        SharedSystem.particles.sparks.remove(this.sparksRight)
        this.context.get(TransformSystem).delete(this.ringLeft.transform)
        this.context.get(TransformSystem).delete(this.ringRight.transform)
        this.context.get(TransformSystem).delete(this.tubeLeft.transform)
        this.context.get(TransformSystem).delete(this.tubeRight.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.beamLeft.transform)
        this.context.get(TransformSystem).delete(this.beamRight.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(ParticleEffectPass).remove(this.ringLeft)
        this.context.get(ParticleEffectPass).remove(this.ringRight)
        this.context.get(ParticleEffectPass).remove(this.tubeLeft)
        this.context.get(ParticleEffectPass).remove(this.tubeRight)
        this.context.get(ParticleEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.beamLeft)
        this.context.get(ParticleEffectPass).remove(this.beamRight)
        this.context.get(ParticleEffectPass).remove(this.cone)
        Sprite.delete(this.beamLeft)
        Sprite.delete(this.beamRight)
        Sprite.delete(this.ringLeft)
        Sprite.delete(this.ringRight)
        BatchMesh.delete(this.tubeLeft)
        BatchMesh.delete(this.tubeRight)
        BatchMesh.delete(this.wave)
        BatchMesh.delete(this.cone)
    }
}