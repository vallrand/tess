import { Application } from '../../engine/framework'
import { clamp, range, lerp, vec2, vec3, vec4, quat, mat4, ease, cubicBezier3D, cubicBezierNormal3D } from '../../engine/math'
import { MeshSystem, Mesh, Line, Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { TransformSystem, FollowPath } from '../../engine/scene'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../engine/pipeline'
import { DecalMaterial, SpriteMaterial, EffectMaterial } from '../../engine/materials'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { doubleSided } from '../../engine/geometry'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, BlendTween } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Decapod extends ControlUnit {
    private static readonly model: string = 'decapod'
    private mesh: Mesh
    public active: boolean = false

    dust: ParticleEmitter
    shadow: Decal


    aura: Decal
    light: PointLight
    cylinder: BatchMesh
    flash: Sprite
    ring: Sprite
    smoke: ParticleEmitter
    muzzle: Sprite
    trail: Line
    embers: ParticleEmitter
    projectile: BatchMesh
    wave: Sprite
    splash: Sprite
    burn: Decal
    pillar: Sprite
    reticle: Decal
    hitLight: PointLight

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Decapod.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Decapod.model].activate(0, this.mesh.armature)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uLifespan: [0.6,1.2,0,0], uSize: [2,4],
            uRadius: [0,0.2], uOrientation: quat.IDENTITY,
            uForce: [2,5], uTarget: vec3.ZERO, uGravity: vec3.ZERO,
            uRotation: [0, 2 * Math.PI], uAngular: [-Math.PI,Math.PI,0,0]
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.shadow = this.context.get(DecalPass).create(4)
        this.shadow.transform = this.context.get(TransformSystem).create()
        this.shadow.transform.parent = this.mesh.transform
        this.shadow.material = new DecalMaterial()
        this.shadow.material.program = this.context.get(DecalPass).program
        this.shadow.material.diffuse = SharedSystem.textures.glow

        const animate = AnimationTimeline(this, {
            'shadow.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.6,1,0.4] }
            ], vec4.lerp),
            'shadow.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.4,0], ease: ease.cubicOut }
            ], BlendTween.vec3),
            'mesh.transform.rotation': PropertyAnimation([
                { frame: 0, value: quat.IDENTITY },
                { frame: 1, value: quat.axisAngle(vec3.AXIS_X, 0.1 * Math.PI, quat()), ease: ease.sineOut }
            ], BlendTween.quat)
        })

        const floatDuration = 0.4
        const duration = path.length * floatDuration + 2 * floatDuration

        this.context.get(TerrainSystem).tilePosition(path[path.length - 1][0], path[path.length - 1][1], this.dust.uniform.uniforms['uOrigin'] as any)
        vec3.copy(this.dust.uniform.uniforms['uOrigin'] as any, this.dust.uniform.uniforms['uTarget'] as any)
        const dustEmit = EventTrigger([
            { frame: duration - 0.5 * floatDuration, value: 16 }
        ], EventTrigger.emit)

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            dustEmit(elapsedTime, this.context.deltaTime, this.dust)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.shadow.transform)
        this.context.get(DecalPass).delete(this.shadow)
    }
    public strike(target: vec3): Generator<ActionSignal> {
        const targetTile = vec2.add([2,-2], this.tile, vec2())
        const targetPosition = this.context.get(TerrainSystem).tilePosition(targetTile[0], targetTile[1], vec3())

        if(this.active){
            return this.launch(targetPosition)
        }else{
            return this.activate(targetPosition)
        }
    }
    private *launch(target: vec3): Generator<ActionSignal> {
        this.active = false

        this.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [0.8,1.4,-0.3,0],
            uOrigin: mat4.transform([0,3.2,0.8],this.mesh.transform.matrix,vec3()),
            uGravity:[0,4,0],
            uRotation:[0,2*Math.PI],
            uSize:[1,3],
            uFieldDomain: [0.5,0.5,0.5,0],
            uFieldStrength: [8,0]
        })

        this.muzzle = new Sprite()
        this.muzzle.billboard = BillboardType.Sphere
        this.muzzle.material = new SpriteMaterial()
        this.muzzle.material.program = this.context.get(ParticleEffectPass).program
        this.muzzle.material.diffuse = SharedSystem.textures.rays
        this.muzzle.transform = this.context.get(TransformSystem)
        .create([0,3.4,1],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.muzzle)

        this.trail = new Line(8)
        this.trail.width = 0.6
        this.trail.ease = ease.cubicFadeInOut
        this.trail.addColorFade(this.trail.ease, vec3(1,0.6,0.4))

        this.trail.material = SharedSystem.materials.trailSmokeMaterial
        this.context.get(ParticleEffectPass).add(this.trail)

        this.wave = new Sprite()
        this.wave.billboard = BillboardType.None
        this.wave.material = new SpriteMaterial()
        this.wave.material.blendMode = null
        this.wave.material.program = SharedSystem.materials.distortion
        this.wave.material.diffuse = SharedSystem.textures.wave
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], target, vec3()), Sprite.FlatUp, vec3.ONE)
        this.context.get(PostEffectPass).add(this.wave)
        
        this.embers = SharedSystem.particles.embers.add({
            uLifespan: [0.4,0.8,0,0],
            uOrigin: target, uTarget: vec3.add(target, [0,-0.2,0], vec3()),
            uRotation: vec2.ZERO, uOrientation: quat.IDENTITY,
            uGravity: vec3(0,-14,0),
            uSize: [0.2,0.8],
            uRadius: [0,0.5],
            uForce: [6,16],
        })

        this.projectile = new BatchMesh(doubleSided(SharedSystem.geometry.hemisphere))
        this.projectile.transform = this.context.get(TransformSystem).create()
        this.projectile.material = SharedSystem.materials.exhaustYellowMaterial
        this.context.get(ParticleEffectPass).add(this.projectile)

        this.splash = new Sprite()
        this.splash.billboard = BillboardType.None
        this.splash.transform = this.context.get(TransformSystem)
        .create(vec3.add(target, [0,0.5,0], vec3()), Sprite.FlatUp, vec3.ONE)
        this.splash.material = new SpriteMaterial()
        this.splash.material.program = this.context.get(ParticleEffectPass).program
        this.splash.material.diffuse = SharedSystem.textures.raysInner
        this.context.get(ParticleEffectPass).add(this.splash)

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.transform = this.context.get(TransformSystem).create(target)
        this.burn.material = new DecalMaterial()
        this.burn.material.program = this.context.get(DecalPass).program
        this.burn.material.diffuse = SharedSystem.textures.rays

        this.pillar = new Sprite()
        this.pillar.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.pillar.origin)
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.groundDust
        this.pillar.transform = this.context.get(TransformSystem).create(target)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.hitLight = this.context.get(PointLightPass).create()
        this.hitLight.transform = this.context.get(TransformSystem)
        .create(vec3.add(target, [0,2,0], vec3()))
        vec3.set(1,0.8,0.5,this.hitLight.color)

        const origin = mat4.transform([0,3.4,0.8], this.mesh.transform.matrix, vec3())
        const controlA = mat4.transform([0,5,3], this.mesh.transform.matrix, vec3())
        const controlB = vec3.set(target[0], controlA[1], target[2], vec3())
        vec3.centroid(controlB, controlA, controlB)
        const curve = FollowPath.curve(
            cubicBezier3D.bind(null, origin, controlA, controlB, target),
            { frame: 0.6, duration: 0.8, ease: ease.CubicBezier(0,0.75,1,0.75) }
        )

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Decapod.model].deactivate,

            'trail': FollowPath.Line(curve, { length: 0.1 }),
            'projectile.transform': FollowPath(curve),
            'projectile.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 0.7, value: [0.2,0.2,1], ease: ease.expoOut },
                { frame: 1.4, value: vec3.ZERO, ease: ease.expoIn }
            ], vec3.lerp),
            'embers': EventTrigger([
                { frame: 1.4, value: 36 }
            ], EventTrigger.emit),

            'hitLight.intensity': PropertyAnimation([
                { frame: 1.4, value: 10 },
                { frame: 1.6, value: 0, ease: ease.sineIn }
            ], lerp),
            'hitLight.radius': PropertyAnimation([
                { frame: 1.4, value: 0 },
                { frame: 1.6, value: 6, ease: ease.quartOut }
            ], lerp),

            'pillar.transform.scale': PropertyAnimation([
                { frame: 1.4, value: vec3.ZERO },
                { frame: 1.9, value: [2,6,2], ease: ease.cubicOut }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 1.4, value: [1,0.9,0.6,0.4] },
                { frame: 1.9, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'splash.transform.scale': PropertyAnimation([
                { frame: 1.4, value: vec3.ZERO },
                { frame: 1.8, value: [6,6,6], ease: ease.cubicOut }
            ], vec3.lerp),
            'splash.color': PropertyAnimation([
                { frame: 1.4, value: [1,0.8,0.4,0.4] },
                { frame: 1.8, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'burn.transform.scale': PropertyAnimation([
                { frame: 1.4, value: vec3.ZERO },
                { frame: 1.8, value: [8,4,8], ease: ease.quartOut }
            ], vec3.lerp),
            'burn.color': PropertyAnimation([
                { frame: 1.6, value: [0.2,0,0,1] },
                { frame: 2.4, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),

            'wave.transform.scale': PropertyAnimation([
                { frame: 1.4, value: vec3.ZERO },
                { frame: 2.0, value: [10,10,10], ease: ease.cubicOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 1.4, value: vec4.ONE },
                { frame: 2.0, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),

            'smoke': EventTrigger([
                { frame: 0.6, value: 24 }
            ], EventTrigger.emit),

            'muzzle.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 0.9, value: [4,4,4], ease: ease.quartOut }
            ], vec3.lerp),
            'muzzle.color': PropertyAnimation([
                { frame: 0.6, value: [1,0.8,0.4,0] },
                { frame: 0.9, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'light.intensity': PropertyAnimation([
                { frame: 0.7, value: 2 },
                { frame: 0.9, value: 20, ease: ease.cubicOut }
            ], lerp),
            'light.color': PropertyAnimation([
                { frame: 0.6, value: [1,0.4,0.6] },
                { frame: 0.8, value: [1,0.6,0.4], ease: ease.quadIn },
                { frame: 1.1, value: vec3.ZERO, ease: ease.sineOut }
            ], vec3.lerp),

            'aura.threshold': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 3, ease: ease.sineOut }
            ], lerp),
            'reticle.color': PropertyAnimation([
                { frame: 0, value: [1,0.4,0.8,0.6] },
                { frame: 1, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
        })

        for(const duration = 2.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.smoke.remove(this.smoke)
        SharedSystem.particles.embers.remove(this.embers)

        this.context.get(TransformSystem).delete(this.aura.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.muzzle.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.splash.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.projectile.transform)
        this.context.get(TransformSystem).delete(this.reticle.transform)

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(DecalPass).delete(this.aura)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(DecalPass).delete(this.reticle)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(ParticleEffectPass).remove(this.muzzle)
        this.context.get(ParticleEffectPass).remove(this.splash)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.projectile)
    }
    private *activate(target: vec3): Generator<ActionSignal> {
        this.active = true
        const origin = this.mesh.transform.position
        const angle = Math.atan2(target[0] - origin[0], target[2] - origin[2])

        this.aura = this.context.get(DecalPass).create(4)
        this.aura.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)

        this.aura.material = SharedSystem.materials.glowSquaresRadialMaterial

        this.reticle = this.context.get(DecalPass).create(4)
        this.reticle.transform = this.context.get(TransformSystem).create(target)
        this.reticle.material = new DecalMaterial()
        this.reticle.material.program = this.context.get(DecalPass).program
        this.reticle.material.diffuse = SharedSystem.textures.reticle

        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.stripesMaterial
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,1.8,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,3,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.light.radius = 4

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.Sphere
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,3.4,1.2],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.flash.material = new SpriteMaterial()
        this.flash.material.program = this.context.get(ParticleEffectPass).program
        this.flash.material.diffuse = SharedSystem.textures.sparkle
        this.context.get(ParticleEffectPass).add(this.flash)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y,Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.ring
        this.context.get(ParticleEffectPass).add(this.ring)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Decapod.model].activate,
            'mesh.transform.rotation': PropertyAnimation([
                { frame: 0.2, value: quat.copy(this.mesh.transform.rotation, quat()) },
                { frame: 0.8, value: quat.axisAngle(vec3.AXIS_Y, angle, quat()), ease: ease.quadInOut }
            ], quat.slerp),

            'flash.transform.scale': PropertyAnimation([
                { frame: 0.9, value: vec3.ZERO },
                { frame: 1.2, value: [2,2,2], ease: ease.quartOut }
            ], vec3.lerp),
            'flash.color': PropertyAnimation([
                { frame: 0.9, value: [1,0.7,0.9,0] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.5, value: vec3.ZERO },
                { frame: 0.9, value: [6,6,6], ease: ease.quartOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.5, value: [0.8,0.2,0.4,1] },
                { frame: 0.9, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'light.intensity': PropertyAnimation([
                { frame: 0.8, value: 0 },
                { frame: 1.4, value: 2, ease: ease.sineOut }
            ], lerp),
            'light.color': PropertyAnimation([
                { frame: 0, value: [1,0.4,0.6] }
            ], vec3.lerp),

            'aura.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [0,4,0] },
                { frame: 0.8, value: [5,4,5], ease: ease.cubicOut }
            ], vec3.lerp),
            'aura.threshold': PropertyAnimation([
                { frame: 0.2, value: -3 },
                { frame: 1.6, value: 0, ease: ease.sineOut }
            ], lerp),
            'reticle.transform.scale': PropertyAnimation([
                { frame: 0.4, value: vec3.ZERO },
                { frame: 0.8, value: [4,4,4], ease: ease.sineOut }
            ], vec3.lerp),
            'reticle.color': PropertyAnimation([
                { frame: 0, value: [1,0.4,0.8,0.4] }
            ], vec4.lerp),

            'cylinder.transform.rotation': PropertyAnimation([
                { frame: 0.4, value: [0,0,0,1] },
                { frame: 0.8, value: [0.309017,0,0,0.951057], ease: ease.sineIn }
            ], quat.slerp),
            'cylinder.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [3,0,3] },
                { frame: 1.0, value: [0,3,0], ease: ease.CubicBezier(0.25,0.75,0.5,0.5) }
            ], vec3.lerp),
            'cylinder.color': PropertyAnimation([
                { frame: 0.4, value: vec4.ZERO },
                { frame: 0.6, value: [1,0.2,0.4,1], ease: ease.cubicOut }
            ], vec4.lerp)
        })

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)

        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.ring)
    }
}