import { lerp, vec2, vec3, vec4, quat, mat4, cubicBezier3D } from '../../../engine/math'
import { Mesh, Line, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { ParticleEmitter } from '../../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'
import { DirectionTile } from '../../player'

const actionTimeline = {
    'mesh.armature': ModelAnimation('deactivate'),
    'projectile.color': PropertyAnimation([
        { frame: 0, value: [1,1,0.5,1] }
    ], vec4.lerp),
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
}

const activateTimeline = {
    'mesh.armature': ModelAnimation('activate'),
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
}

export class MortarSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 8
    readonly cardinal: boolean = false
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Kinetic | DamageType.Temperature
    readonly damage: number = 3
    
    private aura: Decal
    private light: PointLight
    private cylinder: BatchMesh
    private flash: Sprite
    private ring: Sprite
    private smoke: ParticleEmitter
    private muzzle: Sprite
    private trail: Line
    private embers: ParticleEmitter
    private projectile: BatchMesh
    private wave: Sprite
    private splash: Sprite
    private burn: Decal
    private pillar: Sprite
    private reticle: Decal
    private hitLight: PointLight
    private mesh: Mesh

    private readonly target: vec2 = vec2()
    private readonly origin: vec2 = vec2()
    private readonly targetPosition: vec3 = vec3()

    public aim(origin: vec2, tiles: vec2[]): vec2 | null {
        if(!this.active) return super.aim(origin, tiles)
        return origin[0] === this.origin[0] && origin[1] === this.origin[1] ? this.target : null
    }
    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        if(this.active){
            this.active = false
            return this.launch(this.target)
        }else{
            const candidates: vec2[] = Array(4).fill(target)
            for(let i = 0; i < DirectionTile.length; i++){
                const tile = vec2.add(target, DirectionTile[i], vec2())
                if(!this.context.get(TerrainSystem).getTile(tile[0], tile[1])) candidates.push(tile)
            }
            target = candidates[SharedSystem.random() * candidates.length | 0]
            vec2.copy(target, this.target)
            vec2.copy(source.tile, this.origin)
            this.context.get(TerrainSystem).tilePosition(target[0], target[1], this.targetPosition)
            this.active = true
            return this.activate(this.targetPosition)
        }
    }
    private *launch(target: vec2): Generator<ActionSignal> {
        this.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [0.8,1.4,-0.3,0],
            uOrigin: mat4.transform([0,3.2,0.8],this.mesh.transform.matrix,vec3()),
            uGravity:[0,4,0],
            uRotation:[0,2*Math.PI], uSize:[1,3],
            uFieldDomain: [0.5,0.5,0.5,0], uFieldStrength: [8,0]
        })

        this.muzzle = Sprite.create(BillboardType.Sphere)
        this.muzzle.material = SharedSystem.materials.sprite.rays
        this.muzzle.transform = this.context.get(TransformSystem)
        .create([0,3.4,1],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.muzzle)

        this.trail = Line.create(8, 0, 0.6, ease.cubicFadeInOut)
        this.trail.addColorFade(this.trail.ease, vec3(1,0.6,0.4))
        this.trail.material = SharedSystem.materials.effect.trailSmoke
        this.context.get(ParticleEffectPass).add(this.trail)

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.displacement.wave
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], this.targetPosition, vec3()), quat.HALF_X, vec3.ONE)
        this.context.get(PostEffectPass).add(this.wave)
        
        this.embers = SharedSystem.particles.embers.add({
            uLifespan: [0.4,0.8,0,0],
            uOrigin: this.targetPosition, uTarget: [0,-0.2,0],
            uRotation: vec2.ZERO, uOrientation: quat.IDENTITY,
            uGravity: [0,-14,0],
            uSize: [0.2,0.8], uRadius: [0,0.5], uForce: [6,16],
        })

        this.projectile = BatchMesh.create(SharedSystem.geometry.hemisphere)
        this.projectile.transform = this.context.get(TransformSystem).create()
        this.projectile.material = SharedSystem.materials.effect.exhaust
        this.context.get(ParticleEffectPass).add(this.projectile)

        this.splash = Sprite.create(BillboardType.None)
        this.splash.transform = this.context.get(TransformSystem)
        .create(vec3.add(this.targetPosition, [0,0.5,0], vec3()), quat.HALF_X, vec3.ONE)
        this.splash.material = SharedSystem.materials.sprite.burst
        this.context.get(ParticleEffectPass).add(this.splash)

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.transform = this.context.get(TransformSystem).create(this.targetPosition)
        this.burn.material = SharedSystem.materials.decal.rays

        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.material = SharedSystem.materials.sprite.dust
        this.pillar.transform = this.context.get(TransformSystem).create(this.targetPosition)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.hitLight = this.context.get(PointLightPass).create([1,0.8,0.5])
        this.hitLight.transform = this.context.get(TransformSystem)
        .create(vec3.add(this.targetPosition, [0,2,0], vec3()))

        const origin = mat4.transform([0,3.4,0.8], this.mesh.transform.matrix, vec3())
        const controlA = mat4.transform([0,5,3], this.mesh.transform.matrix, vec3())
        const controlB = vec3.set(this.targetPosition[0], controlA[1], this.targetPosition[2], vec3())
        vec3.centroid(controlB, controlA, controlB)
        const curve = FollowPath.curve(
            cubicBezier3D.bind(null, origin, controlA, controlB, this.targetPosition),
            { frame: 0.6, duration: 0.8, ease: ease.CubicBezier(0,0.75,1,0.75) }
        )

        const damage = EventTrigger([{ frame: 1.4, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'trail': FollowPath.Line(curve, { length: 0.1 }),
            'projectile.transform': FollowPath(curve)
        })
        this.context.get(AudioSystem).create(`assets/mortar_use.mp3`, 'sfx', this.mesh.transform).play(0)
        this.context.get(AudioSystem).create(`assets/mortar_hit.mp3`, 'sfx', this.burn.transform).play(1.4)

        for(const duration = 2.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
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
        this.context.get(TransformSystem).delete(this.hitLight.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PointLightPass).delete(this.hitLight)
        this.context.get(DecalPass).delete(this.aura)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(DecalPass).delete(this.reticle)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(ParticleEffectPass).remove(this.muzzle)
        this.context.get(ParticleEffectPass).remove(this.splash)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.projectile)
        Sprite.delete(this.pillar)
        Sprite.delete(this.splash)
        Sprite.delete(this.muzzle)
        Sprite.delete(this.wave)
        Line.delete(this.trail)
        BatchMesh.delete(this.projectile)
    }
    private *activate(target: vec3): Generator<ActionSignal> {
        const origin = this.mesh.transform.position
        const angle = Math.atan2(target[0] - origin[0], target[2] - origin[2])

        this.aura = this.context.get(DecalPass).create(4)
        this.aura.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.aura.material = SharedSystem.materials.glowSquaresRadialMaterial

        this.reticle = this.context.get(DecalPass).create(4)
        this.reticle.transform = this.context.get(TransformSystem).create(target)
        this.reticle.material = SharedSystem.materials.decal.reticle

        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.effect.stripes
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,1.8,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,3,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.light.radius = 4

        this.flash = Sprite.create(BillboardType.Sphere)
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,3.4,1.2],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.flash.material = SharedSystem.materials.sprite.sparkle
        this.context.get(ParticleEffectPass).add(this.flash)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y,quat.HALF_X,vec3.ONE,this.mesh.transform)
        this.ring.material = SharedSystem.materials.sprite.ring
        this.context.get(ParticleEffectPass).add(this.ring)

        const animate = AnimationTimeline(this, {
            ...activateTimeline,
            'mesh.transform.rotation': PropertyAnimation([
                { frame: 0.2, value: quat.copy(this.mesh.transform.rotation, quat()) },
                { frame: 0.8, value: quat.axisAngle(vec3.AXIS_Y, angle, quat()), ease: ease.quadInOut }
            ], quat.slerp),
        })
        this.context.get(AudioSystem).create(`assets/mortar_aim.mp3`, 'sfx', this.mesh.transform).play(0)

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.ring)
        Sprite.delete(this.ring)
        Sprite.delete(this.flash)
        BatchMesh.delete(this.cylinder)
    }
    public *deactivate(immediate?: boolean): Generator<ActionSignal> {
        if(!this.active) return
        this.active = false
        const animate = AnimationTimeline(this, {
            'mesh.armature': ModelAnimation('activate'),
            'light.intensity': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 0.5, value: 2, ease: ease.sineOut }
            ], lerp),
            'aura.threshold': PropertyAnimation([
                { frame: 0, value: -3 },
                { frame: 0.5, value: 0, ease: ease.sineOut }
            ], lerp),
            'reticle.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 0.5, value: [1,0.4,0.8,0.4], ease: ease.quadOut }
            ], vec4.lerp)
        })

        if(!immediate)
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(duration - elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.aura.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.reticle.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(DecalPass).delete(this.aura)
        this.context.get(DecalPass).delete(this.reticle)
    }
}