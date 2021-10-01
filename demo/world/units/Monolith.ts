import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, ease, shortestAngle } from '../../engine/math'
import { ShaderProgram } from '../../engine/webgl'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../engine/components'
import { TransformSystem, AnimationSystem, ActionSignal } from '../../engine/scene'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../engine/pipeline'
import { DecalMaterial, SpriteMaterial, ShaderMaterial } from '../../engine/materials'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { doubleSided } from '../../engine/geometry'
import { shaders } from '../../engine/shaders'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath } from '../../engine/scene'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'
import { AISystem } from '../mechanics'

interface TurretEffect {
    key: string
    index: number
    parent: Monolith

    trailLeft?: Line
    trailRight?: Line
    dust?: Sprite
    flashLeft?: Sprite
    flashRight?: Sprite
    light?: PointLight
    ring?: Sprite
    wave?: BatchMesh
    sparks?: ParticleEmitter
}

interface SpawnerEffect {
    key: string
    index: number
    parent: Monolith
    tile: vec2

    scarab?: ControlUnit
    light?: PointLight
    glow?: BatchMesh
    beam?: Sprite
    smoke?: ParticleEmitter
    ring?: Sprite
}

export class Monolith extends ControlUnit {
    private static readonly model: string = 'monolith'
    public readonly size: vec2 = vec2(3,3)

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
    private readonly turrets: TurretEffect[] = [{
        key: 'turret11', index: 10, parent: this
    }, {
        key: 'turret01', index: 12, parent: this
    }, {
        key: 'turret00', index: 14, parent: this
    }, {
        key: 'turret10', index: 16, parent: this
    }]
    private readonly spawners: SpawnerEffect[] = [{
        key: 'spawner6', index: 6, parent: this, tile: vec2(3,1)
    }, {
        key: 'spawner7', index: 7, parent: this, tile: vec2(1,-1)
    }, {
        key: 'spawner8', index: 8, parent: this, tile: vec2(1,3)
    }, {
        key: 'spawner9', index: 9, parent: this, tile: vec2(-1,1)
    }]
    public strike(target: vec2): Generator<ActionSignal> {
        target = [this.tile[0] + 2 + 2, this.tile[1] + 2 - 2]
        //return AnimationSystem.zip(this.turrets.map(turret => this.activateTurret(turret, target)))
        return AnimationSystem.zip(this.spawners.map(spawner => this.activateSpawner(spawner)))
    }
    private *activateTurret(effect: TurretEffect, target: vec2): Generator<ActionSignal> {
        const originPosition = mat4.transform(vec3.ZERO, this.mesh.armature.nodes[effect.index].globalTransform, vec3())
        const referenceAngle = Math.atan2(originPosition[0], originPosition[2])
        vec3.add(this.mesh.transform.position, originPosition, originPosition)
        const targetPosition = this.context.get(TerrainSystem).tilePosition(target[0], target[1], vec3())
        const direction = vec3.subtract(targetPosition, originPosition, vec3())

        const angleXZ = Math.atan2(direction[0], direction[2])
        if(Math.abs(shortestAngle(angleXZ, referenceAngle)) > 0.25*Math.PI) return
        const originRotation = quat.axisAngle(vec3.AXIS_Y, referenceAngle, quat())
        const targetRotation = quat.fromNormal(vec3.normalize(direction, vec3()), vec3.AXIS_Y, quat())
        
        effect.dust = new Sprite()
        effect.dust.billboard = BillboardType.Cylinder
        vec2.set(0,0.5, effect.dust.origin)
        effect.dust.material = new SpriteMaterial()
        effect.dust.material.program = this.context.get(ParticleEffectPass).program
        effect.dust.material.diffuse = SharedSystem.textures.groundDust
        effect.dust.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(ParticleEffectPass).add(effect.dust)

        const trailMaterial = new SpriteMaterial()
        trailMaterial.program = this.context.get(ParticleEffectPass).program
        trailMaterial.diffuse = SharedSystem.gradients.tealLine

        effect.trailLeft = new Line(2)
        effect.trailLeft.width = 0.3
        effect.trailLeft.ease = ease.reverse(ease.quadIn)
        effect.trailLeft.addColorFade(effect.trailLeft.ease)
        effect.trailLeft.material = trailMaterial
        this.context.get(ParticleEffectPass).add(effect.trailLeft)

        effect.trailRight = new Line(2)
        effect.trailRight.width = 0.3
        effect.trailRight.ease = ease.reverse(ease.quadIn)
        effect.trailRight.addColorFade(effect.trailRight.ease)
        effect.trailRight.material = trailMaterial
        this.context.get(ParticleEffectPass).add(effect.trailRight)

        const transformMatrix = mat4.fromRotationTranslationScale(targetRotation,originPosition,vec3.ONE,mat4())
        
        const originLeft = mat4.transform([0.25,0,1], transformMatrix, vec3())
        const originRight = mat4.transform([-0.25,0,1], transformMatrix, vec3())

        const targetLeft = vec3.add(originLeft, direction, vec3())
        const targetRight = vec3.add(originRight, direction, vec3())

        const flashMaterial = new SpriteMaterial()
        flashMaterial.program = this.context.get(ParticleEffectPass).program
        flashMaterial.diffuse = SharedSystem.textures.rays


        effect.flashLeft = new Sprite()
        effect.flashLeft.billboard = BillboardType.Sphere
        effect.flashLeft.material = flashMaterial
        effect.flashRight = new Sprite()
        effect.flashRight.billboard = BillboardType.Sphere
        effect.flashRight.material = effect.flashLeft.material
        effect.flashLeft.transform = this.context.get(TransformSystem)
        .create(mat4.transform([0.25,0,1.5], transformMatrix, vec3()))
        effect.flashRight.transform = this.context.get(TransformSystem)
        .create(mat4.transform([-0.25,0,1.5], transformMatrix, vec3()))
        this.context.get(ParticleEffectPass).add(effect.flashLeft)
        this.context.get(ParticleEffectPass).add(effect.flashRight)

        effect.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.8,0,0],
            uOrigin: targetPosition, uTarget: vec3.add([0,-0.2,0], targetPosition, vec3()),
            uLength: [0.1,0.2], uSize: [0.2,0.4],
            uForce: [4,12], uRadius: [0.2,0.2], uGravity: [0,-24,0],
        })

        effect.ring = new Sprite()
        effect.ring.billboard = BillboardType.None
        effect.ring.material = new SpriteMaterial()
        effect.ring.material.program = this.context.get(ParticleEffectPass).program
        effect.ring.material.diffuse = SharedSystem.textures.ring
        effect.ring.transform = this.context.get(TransformSystem)
        .create(vec3.add(targetPosition, [0,0.2,0], vec3()), Sprite.FlatUp)
        this.context.get(ParticleEffectPass).add(effect.ring)

        effect.wave = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        effect.wave.material = SharedSystem.materials.ringDustMaterial
        effect.wave.transform = this.context.get(TransformSystem)
        .create(targetPosition, quat.IDENTITY)
        this.context.get(ParticleEffectPass).add(effect.wave)

        effect.light = this.context.get(PointLightPass).create([0.4,1,0.9])
        effect.light.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,1,0], targetPosition, vec3()))

        const animate = AnimationTimeline(effect, {
            'parent.mesh.armature': modelAnimations[Monolith.model][effect.key],
            [`parent.mesh.armature.nodes.${effect.index}.rotation`]: PropertyAnimation([
                { frame: 0.0, value: originRotation },
                { frame: 0.4, value: targetRotation, ease: ease.cubicOut },
                { frame: 0.8, value: targetRotation, ease: ease.linear },
                { frame: 1.4, value: originRotation, ease: ease.quadInOut }
            ], quat.slerp),

            'dust.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.2, value: [1.6,4,1.6], ease: ease.quartOut }
            ], vec3.lerp),
            'dust.color': PropertyAnimation([
                { frame: 0.7, value: [0,0.1,0.1,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'trailLeft': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originLeft },
                { frame: 0.6, value: targetLeft, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            'trailRight': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originRight },
                { frame: 0.6, value: targetRight, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            'flashLeft.transform.scale': PropertyAnimation([
                { frame: 0.3, value: vec3.ZERO },
                { frame: 0.5, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'flashLeft.color': PropertyAnimation([
                { frame: 0.3, value: [0.6,1,1,0] },
                { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'flashRight.transform.scale': PropertyAnimation([
                { frame: 0.3, value: vec3.ZERO },
                { frame: 0.5, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'flashRight.color': PropertyAnimation([
                { frame: 0.3, value: [0.6,1,1,0] },
                { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'sparks': EventTrigger([
                { frame: 0.5, value: 24 }
            ], EventTrigger.emit),
            'ring.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.0, value: [4,4,4], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.6, value: [0.4,1,0.9,0.4] },
                { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0.6, value: 0 },
                { frame: 1.0, value: 4, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.6, value: 4 },
                { frame: 1.0, value: 0, ease: ease.sineIn }
            ], lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: 0.7, value: [0,2,0] },
                { frame: 1.2, value: [4,1,4], ease: ease.quartOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.7, value: [0.2,1,0.8,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineOut }
            ], vec4.lerp)
        })

        for(const duration = 1.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.sparks.remove(effect.sparks)
        this.context.get(TransformSystem).delete(effect.wave.transform)
        this.context.get(TransformSystem).delete(effect.dust.transform)
        this.context.get(TransformSystem).delete(effect.flashLeft.transform)
        this.context.get(TransformSystem).delete(effect.flashRight.transform)
        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.ring.transform)

        this.context.get(PointLightPass).delete(effect.light)
        this.context.get(ParticleEffectPass).remove(effect.wave)
        this.context.get(ParticleEffectPass).remove(effect.dust)
        this.context.get(ParticleEffectPass).remove(effect.flashLeft)
        this.context.get(ParticleEffectPass).remove(effect.flashRight)
        this.context.get(ParticleEffectPass).remove(effect.ring)
    }
    private *activateSpawner(effect: SpawnerEffect): Generator<ActionSignal> {
        const offset = this.mesh.armature.nodes[effect.index].position
        const rotation = this.mesh.armature.nodes[effect.index].rotation
        const parentTransform = this.context.get(TransformSystem)
        .create(offset, rotation, vec3.ONE, this.mesh.transform)
        parentTransform.recalculate(this.context.frame)

        effect.glow = new BatchMesh(SharedSystem.geometry.openBox)
        effect.glow.material = SharedSystem.materials.gradientMaterial
        effect.glow.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.axisAngle(vec3.AXIS_Y, 0.5*Math.PI, quat()), vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.glow)

    
        effect.beam = new Sprite()
        effect.beam.billboard = BillboardType.Cylinder
        vec2.set(0,0.5, effect.beam.origin)
        effect.beam.material = new SpriteMaterial()
        effect.beam.material.program = this.context.get(ParticleEffectPass).program
        effect.beam.material.diffuse = SharedSystem.textures.raysBeam
        effect.beam.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.axisAngle(vec3.AXIS_Y, 0.5*Math.PI, quat()), vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.beam)

        effect.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [0.8,1.2,-0.4,0],
            uOrigin: mat4.transform([0,0.5,-1],parentTransform.matrix,vec3()),
            uGravity:[0,8,0],
            uRotation:[0,2*Math.PI], uSize:[1,4],
            uFieldDomain: vec4.ONE, uFieldStrength: [4,0]
        })

        effect.ring = new Sprite()
        effect.ring.billboard = BillboardType.None
        effect.ring.material = new SpriteMaterial()
        effect.ring.material.program = this.context.get(ParticleEffectPass).program
        effect.ring.material.diffuse = SharedSystem.textures.swirl
        effect.ring.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.ring)

        effect.light = this.context.get(PointLightPass).create([1,0.6,0.7])
        effect.light.transform = parentTransform

        effect.scarab = this.context.get(AISystem).create(this.tile[0] + effect.tile[0], this.tile[1] + effect.tile[1], 0)

        const animate = AnimationTimeline(effect, {
            'scarab.mesh.color': PropertyAnimation([
                { frame: 0.4, value: [16,0,0,0.2] },
                { frame: 1.6, value: vec4.ONE, ease: ease.quadIn }
            ], vec4.lerp),
            'scarab.mesh.transform.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, Math.atan2(offset[0], offset[2]), quat()) }
            ], quat.slerp),
            'scarab.mesh.transform.position': PropertyAnimation([
                { frame: 0.4, value: mat4.transform([0,-0.5,-1], parentTransform.matrix, vec3()) },
                { frame: 1.6, value: vec3.copy(effect.scarab.mesh.transform.position, vec3()), ease: ease.quartOut }
            ], vec3.lerp),

            'light.radius': PropertyAnimation([
                { frame: 0.2, value: 0 },
                { frame: 1.2, value: 4, ease: ease.quadOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.2, value: 6 },
                { frame: 1.2, value: 0, ease: ease.sineIn }
            ], lerp),

            'parent.mesh.armature': modelAnimations[Monolith.model][effect.key],
            'glow.transform.scale': PropertyAnimation([
                { frame: 0.2, value: [1,0,1] },
                { frame: 1.1, value: [1,4,1], ease: ease.cubicOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0.2, value: [1,0.4,0.6,0] },
                { frame: 1.1, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'beam.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [4,0,4] },
                { frame: 0.8, value: [2,4,2], ease: ease.quartOut }
            ], vec3.lerp),
            'beam.color': PropertyAnimation([
                { frame: 0.4, value: [0.8,0.7,1,0] },
                { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'smoke': EventTrigger([
                { frame: 0, value: 24 }
            ], EventTrigger.emit),
            'ring.transform.scale': PropertyAnimation([
                { frame: 0.4, value: vec3.ZERO },
                { frame: 1.0, value: [6,6,6], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.4, value: [1.0,0.7,0.8,0.4] },
                { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.ring.transform)
        this.context.get(TransformSystem).delete(effect.glow.transform)
        this.context.get(TransformSystem).delete(effect.beam.transform)

        this.context.get(ParticleEffectPass).remove(effect.ring)
        this.context.get(ParticleEffectPass).remove(effect.glow)
        this.context.get(ParticleEffectPass).remove(effect.beam)

        SharedSystem.particles.smoke.remove(effect.smoke)
        this.context.get(PointLightPass).delete(effect.light)
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