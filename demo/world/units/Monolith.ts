import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { ShaderProgram } from '../../engine/webgl'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { TransformSystem, AnimationSystem, ActionSignal,  } from '../../engine/scene'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../engine/pipeline'
import { DecalMaterial, SpriteMaterial, ShaderMaterial } from '../../engine/materials'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { doubleSided } from '../../engine/geometry'
import { shaders } from '../../engine/shaders'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Monolith extends ControlUnit {
    private static readonly model: string = 'monolith'
    public readonly size: vec2 = vec2(3,3)
    private mesh: Mesh

    private glow: BatchMesh
    private light: PointLight
    private pulse: Mesh
    private ring: Sprite
    private cylinder: BatchMesh
    private speedlines: ParticleEmitter
    private cone: BatchMesh
    private flash: Sprite

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Monolith.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Monolith.model].activate(0, this.mesh.armature)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
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

        const floatDuration = 1
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, false), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)

            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.glow)
    }
    public strike(target: vec2): Generator<ActionSignal> {
        return this.activate()
    }
    private *activate(): Generator<ActionSignal> {
        this.pulse = new Mesh()
        this.pulse.order = 1
        this.pulse.buffer = SharedSystem.geometry.sphereMesh
        const pulseMaterial = new ShaderMaterial()
        pulseMaterial.cullFace = 0
        pulseMaterial.depthTest = 0
        pulseMaterial.depthWrite = false
        pulseMaterial.blendMode = ShaderMaterial.Premultiply
        pulseMaterial.program = ShaderProgram(this.context.gl, shaders.geometry_vert, require('../shaders/pulse_frag.glsl'), {})
        this.pulse.material = pulseMaterial
        this.pulse.transform = this.context.get(TransformSystem)
        .create([0,6,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.pulse)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,4,0],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.energyHalfPurpleMaterial
        this.cylinder.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.speedlines = SharedSystem.particles.energy.add({
            uLifespan: [0.6,1,-0.2,0],
            uOrigin: mat4.transform([0,0,0], this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO,
            uGravity: [0,8,0],
            uSize: [0.2,0.6],
            uRadius: [3,5],
            uForce: vec2.ZERO,
            uTarget: mat4.transform([0,5,0], this.mesh.transform.matrix, vec3())
        })

        this.cone = new BatchMesh(doubleSided(SharedSystem.geometry.hemisphere))
        this.cone.material = SharedSystem.materials.absorbTealMaterial
        this.cone.transform = this.context.get(TransformSystem)
        .create([0,2.5,0],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.Sphere
        this.flash.material = new SpriteMaterial()
        this.flash.material.program = this.context.get(ParticleEffectPass).program
        this.flash.material.diffuse = SharedSystem.textures.raysRing
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,5,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Monolith.model].activate,
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
        })

        while(true)
        for(const duration = 2.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
}