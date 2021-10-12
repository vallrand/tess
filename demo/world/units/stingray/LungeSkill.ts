import { Application } from '../../../engine/framework'
import { vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEmitter } from '../../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEffectPass } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'

import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIUnitSkill } from '../../opponent'

const actionTimeline = {
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
    public readonly cost: number = 1
    public readonly radius: number = 2
    public readonly cardinal: boolean = false
    public readonly damage: number = 4

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
            uTarget: mat4.transform(vec3(0.5,1,3), this.mesh.transform.matrix, vec3()),
        })
        this.spikesRight = SharedSystem.particles.energy.add({
            uLifespan: [0.8,1.2,0,0],
            uOrigin: mat4.transform(vec3(-0.5,1.5,-0.5), this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.4,1.2], uRadius: [0.5,1.5], uForce: [6,8],
            uTarget: mat4.transform(vec3(-0.5,1,3), this.mesh.transform.matrix, vec3()),
        })
    
        this.tubeLeft = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.tubeRight = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
    
        this.tubeLeft.material = SharedSystem.materials.absorbTealMaterial
        this.tubeRight.material = SharedSystem.materials.absorbTealMaterial
    
        this.tubeLeft.transform = this.context.get(TransformSystem).create()
        this.tubeLeft.transform.parent = this.mesh.transform
        vec3.set(0.5,1.3,1.2, this.tubeLeft.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.tubeLeft.transform.rotation)
    
        this.tubeRight.transform = this.context.get(TransformSystem).create()
        this.tubeRight.transform.parent = this.mesh.transform
        vec3.set(-0.5,1.3,1.2, this.tubeRight.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.tubeRight.transform.rotation)
    
        this.context.get(ParticleEffectPass).add(this.tubeLeft)
        this.context.get(ParticleEffectPass).add(this.tubeRight)
    
    
        const beamMaterial = new SpriteMaterial()
        beamMaterial.program = this.context.get(ParticleEffectPass).program
        beamMaterial.diffuse = SharedSystem.textures.sparkle
    
        this.beamLeft = new Sprite()
        this.beamRight = new Sprite()
        this.beamLeft.billboard = BillboardType.Cylinder
        this.beamRight.billboard = BillboardType.Cylinder
        this.beamLeft.material = beamMaterial
        this.beamRight.material = beamMaterial
        this.beamLeft.transform = this.context.get(TransformSystem).create()
        this.beamRight.transform = this.context.get(TransformSystem).create()
        this.beamLeft.transform.parent = this.mesh.transform
        this.beamRight.transform.parent = this.mesh.transform
    
        this.beamRight.order = 4
        this.beamLeft.order = 4
    
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.beamLeft.transform.rotation)
        vec3.set(-0.5,1.3,3, this.beamLeft.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.beamRight.transform.rotation)
        vec3.set(0.5,1.3,3, this.beamRight.transform.position)
    
        this.context.get(ParticleEffectPass).add(this.beamLeft)
        this.context.get(ParticleEffectPass).add(this.beamRight)
    
    
        this.ringLeft = new Sprite()
        this.ringRight = new Sprite()
        this.ringLeft.billboard = BillboardType.Sphere
        this.ringRight.billboard = BillboardType.Sphere
    
        const ringMaterial = new SpriteMaterial()
        ringMaterial.program = this.context.get(ParticleEffectPass).program
        ringMaterial.diffuse = SharedSystem.textures.raysInner
    
        this.ringLeft.material = ringMaterial
        this.ringRight.material = ringMaterial
    
        this.ringLeft.transform = this.context.get(TransformSystem)
        .create(vec3(-0.5,1.3,3), quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.ringRight.transform = this.context.get(TransformSystem)
        .create(vec3(0.5,1.3,3), quat.IDENTITY, vec3.ONE, this.mesh.transform)
    
        this.context.get(ParticleEffectPass).add(this.ringLeft)
        this.context.get(ParticleEffectPass).add(this.ringRight)
    
        this.ringRight.order = 4
        this.ringLeft.order = 4
    
        this.sparksLeft = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(-0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: mat4.transform(vec3(-0.5,1.3,3), this.mesh.transform.matrix, vec3()),
        })
        this.sparksRight = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: mat4.transform(vec3(0.5,1.3,3), this.mesh.transform.matrix, vec3()),
        })
    
        this.wave = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.wave.material = SharedSystem.materials.stripesMaterial
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3(0,1.3,3), quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)
    
        this.context.get(ParticleEffectPass).add(this.wave)
    
        this.cone = new BatchMesh(SharedSystem.geometry.cone)
        this.cone.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, Sprite.FlatUp, vec3.ONE, this.mesh.transform)
    
        this.cone.material = new SpriteMaterial()
        this.cone.material.diffuse = SharedSystem.textures.raysWrap
        this.cone.material.program = this.context.get(ParticleEffectPass).program
        this.context.get(ParticleEffectPass).add(this.cone)
    
        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,
            'damage': EventTrigger([{ frame: 0.5, value: target }], AIUnitSkill.damage)
        })
    
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
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
    }
}