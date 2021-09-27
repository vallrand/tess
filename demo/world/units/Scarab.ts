import { Application } from '../../engine/framework'
import { random, randomFloat, clamp, lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { GL } from '../../engine/webgl'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { TransformSystem } from '../../engine/scene'
import { ParticleEffectPass, DecalPass, Decal } from '../../engine/pipeline'
import { SpriteMaterial, EffectMaterial, DecalMaterial } from '../../engine/materials'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger, BlendTween } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'
import { Direction, DirectionAngle, DirectionTile } from '../player'

export class Scarab extends ControlUnit {
    private static readonly model: string = 'scarab'
    private mesh: Mesh
    private dust: ParticleEmitter
    private ring: Sprite
    private rays: Sprite
    private sparks: ParticleEmitter
    private cone: BatchMesh
    private beam: Sprite
    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Scarab.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Scarab.model].activate(0, this.mesh.armature)

        //this.actionIndex = this.context.get(AnimationSystem).start(this.appear(), true)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *appear(): Generator<ActionSignal> {
        const origin = vec3.copy(this.mesh.transform.position, vec3())

        this.dust = SharedSystem.particles.dust.add({
            uLifespan: [0.6,0.8,-0.2,0],
            uOrigin: origin,
            uGravity: vec3.ZERO,
            uOrientation: quat.IDENTITY,
            uRadius: [0,0.5],
            uSize: [1,4],
            uRotation: [0,2*Math.PI],
            uTarget: vec3.add(origin, [0, -0.5, 0], vec3()),
            uForce: [2,4],
            uAngular: [-Math.PI,Math.PI,0,0]
        })
        const animate = AnimationTimeline(this, {
            'dust': EmitterTrigger({ frame: 0, value: 16 }),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.add(origin, [0,-1,0], vec3()) },
                { frame: 1, value: origin, ease: ease.quadOut }
            ], vec3.lerp)
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.dust.remove(this.dust)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
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

        const floatDuration = 0.4
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }
    }
    public *strike(target: vec2): Generator<ActionSignal> {
        this.cone = new BatchMesh(SharedSystem.geometry.hemisphere)
        this.cone.material = SharedSystem.materials.coneTealMaterial

        this.cone.transform = this.context.get(TransformSystem).create()
        this.cone.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.cone)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.ring)

        this.rays = new Sprite()
        this.rays.billboard = BillboardType.None
        this.rays.material = new SpriteMaterial()
        this.rays.material.program = this.context.get(ParticleEffectPass).program
        this.rays.material.diffuse = SharedSystem.textures.rays
        this.rays.transform = this.context.get(TransformSystem).create()
        this.rays.transform.parent = this.mesh.transform
        vec3.set(0,1,0.96, this.rays.transform.position)
        quat.axisAngle(vec3.AXIS_Z, randomFloat(0, 2 * Math.PI, random), this.rays.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.rays)

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem).create()
        this.beam.transform.parent = this.mesh.transform
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.beam.transform.rotation)
        vec3.set(0,1,0, this.beam.transform.position)
        vec2.set(0,0.5,this.beam.origin)
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
            'sparks': EmitterTrigger({ frame: 0.2, value: 36 }),
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
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            modelAnimations[Scarab.model].activate(elapsedTime, this.mesh.armature)
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
    }
}