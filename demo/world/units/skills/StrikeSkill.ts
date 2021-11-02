import { Application } from '../../../engine/framework'
import { randomFloat, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { ParticleEmitter } from '../../../engine/particles'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIUnitSkill, IDamageSource, DamageType } from '../../military'
import { TerrainSystem } from '../../terrain'

const actionTimeline = {
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.4, value: vec3.ZERO },
        { frame: 1.0, value: [2,6,2], ease: ease.quartOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.4, value: [0.9,0.7,1,0.2] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'cone.transform.position': PropertyAnimation([
        { frame: 0.2, value: [0,1,1] },
        { frame: 0.8, value: [0,1,2], ease: ease.quartOut }
    ], vec3.lerp),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [0,0,0] },
        { frame: 0.8, value: [2,2,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0.2, value: [0.9,0.6,1,0.4] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'sparks': EventTrigger([{ frame: 0.2, value: 36 }], EventTrigger.emit),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.3, value: vec3.ZERO },
        { frame: 0.8, value: [8,8,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.transform.position': PropertyAnimation([
        { frame: 0.3, value: [0,1,1.5] },
        { frame: 0.8, value: [0,1,0.5], ease: ease.quadOut }
    ], vec3.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0.3, value: quat.IDENTITY },
        { frame: 0.8, value: quat.axisAngle(vec3.AXIS_Z, -Math.PI, quat()), ease: ease.sineOut }
    ], quat.slerp),
    'ring.color': PropertyAnimation([
        { frame: 0.3, value: [0.8,0.7,0.8,0.6] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'rays.transform.scale': PropertyAnimation([
        { frame: 0.2, value: vec3.ZERO },
        { frame: 0.6, value: [5,5,5], ease: ease.quartOut }
    ], vec3.lerp),
    'rays.color': PropertyAnimation([
        { frame: 0.4, value: [0.6,0.7,0.8,0.2] },
        { frame: 0.6, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp)
}

export class StrikeSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = Math.SQRT2
    public readonly cardinal: boolean = false
    public readonly damage: IDamageSource = { amount: 1, type: DamageType.Kinetic }
    
    private ring: Sprite
    private rays: Sprite
    private sparks: ParticleEmitter
    private cone: BatchMesh
    private beam: Sprite
    private mesh: Mesh
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        for(const generator = source.rotate(target); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }
        this.mesh = source.mesh
        
        this.cone = BatchMesh.create(SharedSystem.geometry.hemisphere)
        this.cone.material = SharedSystem.materials.coneTealMaterial

        this.cone.transform = this.context.get(TransformSystem).create()
        this.cone.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.cone)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.ring)

        this.rays = Sprite.create(BillboardType.None)
        this.rays.material = new SpriteMaterial()
        this.rays.material.program = this.context.get(ParticleEffectPass).program
        this.rays.material.diffuse = SharedSystem.textures.rays
        this.rays.transform = this.context.get(TransformSystem)
        .create([0,1,0.96], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        quat.axisAngle(vec3.AXIS_Z, randomFloat(0, 2 * Math.PI, SharedSystem.random()), this.rays.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.rays)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0, 0.5])
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y, Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.3,0.6,-0.2,0],
            uOrigin: mat4.transform(vec3(0,1,1), this.mesh.transform.matrix, vec3()),
            uGravity: vec3.ZERO,
            uLength: [0.1,0.2],
            uSize: [0.1,0.2],
            uForce: [4,8],
            uRadius: [0,0.5],
            uTarget: mat4.transform(vec3(0,1,1), this.mesh.transform.matrix, vec3()),
        })

        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,
            'damage': EventTrigger([{ frame: 0.2, value: target }], AIUnitSkill.damage)
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.sparks.remove(this.sparks)

        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.rays.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)

        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.rays)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.cone)
        Sprite.delete(this.ring)
        Sprite.delete(this.rays)
        Sprite.delete(this.beam)
        BatchMesh.delete(this.cone)
    }
}