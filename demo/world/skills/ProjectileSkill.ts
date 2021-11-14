import { Application } from '../../engine/framework'
import { lerp, mat4, mod, quat, vec2, vec3, vec4 } from '../../engine/math'
import { BatchMesh, BillboardType, Line, Sprite } from '../../engine/components'
import { ParticleEmitter } from '../../engine/particles'
import { Decal, DecalPass, ParticleEffectPass, PointLight, PointLightPass, PostEffectPass } from '../../engine/pipeline'
import { TransformSystem, Transform } from '../../engine/scene'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, FollowPath, ease } from '../../engine/animation'

import { TurnBasedSystem, Direction, DirectionAngle, DirectionTile } from '../player'
import { SharedSystem, ModelAnimation } from '../shared'
import { TerrainSystem } from '../terrain'
import { DamageType, IUnitAttribute } from '../military'
import { CubeSkill } from './CubeSkill'

const steeringTimeline = {
    'sphere.color': PropertyAnimation([
        { frame: 0.1, value: vec4.ONE },
        { frame: 0.6, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'sphere.transform.scale': PropertyAnimation([
        { frame: 0.1, value: vec3.ZERO },
        { frame: 0.6, value: [1.8,1.8,1.8], ease: ease.cubicOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 0, value: [1,0.9,0.6,0] },
        { frame: 0.3, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO},
        { frame: 0.3, value: [8,8,8], ease: ease.quartOut }
    ], vec3.lerp),
    'burn.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.1, value: [8,4,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'burn.color': PropertyAnimation([
        { frame: 1, value: [0,0,0,1] },
        { frame: 2, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.3, value: 4, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 8 },
        { frame: 0.3, value: 0, ease: ease.sineIn }
    ], lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0.1, value: vec3.ZERO },
        { frame: 0.4, value: [8,8,8], ease: ease.quartOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0.1, value: [1,1,1,0.4] },
        { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'embers': EventTrigger([{ frame: 0, value: 72 }], EventTrigger.emit),
}

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'particles': EventTrigger([{ frame: 0, value: 36 }], EventTrigger.emit),
    'bulge.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [3,3,3], ease: ease.quartOut }
    ], vec3.lerp),
    'bulge.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [4,4,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.2, value: vec4.ONE },
        { frame: 0.5, value: [1,1,1,0.2], ease: ease.sineIn }
    ], vec4.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.1, value: [4,4,4], ease: ease.cubicIn },
        { frame: 0.3, value: vec3.ZERO, ease: ease.quadOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0, value: [1,1,0.8,0] },
        { frame: 0.3, value: [0.6,0.6,0,0], ease: ease.quadIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.5, value: 5, ease: ease.quartOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.1, value: 4, ease: ease.quadIn },
        { frame: 0.5, value: 0, ease: ease.cubicOut }
    ], lerp)
}

class Projectile {
    static fade: ease.IEase = x => 1 - Math.pow(1 - x * (1-x) * 4, 2)
    readonly origin: vec3 = vec3()
    readonly target: vec3 = vec3()
    private transform: Transform
    private sphere: BatchMesh
    private embers: ParticleEmitter
    private trail: Line
    private glow: Sprite
    private light: PointLight
    private burn: Decal
    private wave: Sprite
    constructor(private readonly context: Application, private readonly parent: ProjectileSkill){}
    public *play(transform: mat4, target: vec2): Generator<ActionSignal> {
        this.context.get(TerrainSystem).tilePosition(target[0], target[1], this.target)
        mat4.transform(vec3.ZERO, transform, this.origin)

        this.transform = this.context.get(TransformSystem).create(this.origin)

        this.trail = Line.create(8, -2, 0.4, ease.reverse(ease.quadIn), true)
        this.trail.material = SharedSystem.materials.sprite.lineYellow
        this.context.get(ParticleEffectPass).add(this.trail)

        this.sphere = BatchMesh.create(SharedSystem.geometry.lowpoly.sphere, 8)
        this.sphere.material = SharedSystem.materials.effect.coreYellow
        this.sphere.transform = this.context.get(TransformSystem).create(this.target)
        this.context.get(ParticleEffectPass).add(this.sphere)

        this.glow = Sprite.create(BillboardType.None)
        this.glow.material = SharedSystem.materials.sprite.halo
        this.glow.transform = this.context.get(TransformSystem).create(this.target, quat.HALF_N_X)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.displacement.wave
        this.wave.transform = this.context.get(TransformSystem).create(this.target, quat.HALF_N_X)
        this.context.get(PostEffectPass).add(this.wave)

        this.burn = this.context.get(DecalPass).create(0)
        this.burn.material = SharedSystem.materials.decal.particle
        this.burn.transform = this.context.get(TransformSystem).create(this.target)

        this.light = this.context.get(PointLightPass).create([1,0.9,0.5])
        this.light.transform = this.context.get(TransformSystem).create(this.target)
        this.light.transform.position[1] += 0.5

        this.embers = SharedSystem.particles.embers.add({
            uLifespan: [0.2,0.4,-0.2,0],
            uOrigin: this.target,
            uRotation: vec2.ZERO, uOrientation: quat.IDENTITY,
            uGravity: vec3(0,-19.6,0),
            uSize: [0.2,0.6],
            uRadius: [0.2,0.5],
            uForce: [8,16],
            uTarget: [0,-0.2,0]
        })

        const travelDuration = Math.sqrt(vec3.distanceSquared(this.origin, this.target)) * 0.025
        const damage = EventTrigger([{ frame: 0, value: target }], CubeSkill.damage)
        const animate = AnimationTimeline(this, {
            ...steeringTimeline,
            'trail': FollowPath.Line(FollowPath.separate(
                PropertyAnimation([
                    { frame: -travelDuration, value: this.origin[0] },
                    { frame: 0, value: this.target[0], ease: ease.linear }
                ], lerp),
                PropertyAnimation([
                    { frame: -travelDuration, value: this.origin[1] },
                    { frame: 0, value: this.target[1], ease: ease.cubicIn }
                ], lerp),
                PropertyAnimation([
                    { frame: -travelDuration, value: this.origin[2] },
                    { frame: 0, value: this.target[2], ease: ease.linear }
                ], lerp),
            ), { length: 0.06 }),
            'transform.position.1': PropertyAnimation([
                { frame: -travelDuration, value: this.origin[1] },
                { frame: 0, value: this.target[1], ease: ease.cubicIn }
            ], lerp),
            'transform.position': PropertyAnimation([
                { frame: -travelDuration, value: this.origin },
                { frame: 0, value: this.target, ease: ease.linear }
            ], vec3.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime + travelDuration; true;){
            const elapsedTime = this.context.currentTime - startTime    
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this.parent)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.sphere.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        SharedSystem.particles.embers.remove(this.embers)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.sphere)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(PostEffectPass).remove(this.wave)
        Sprite.delete(this.wave)
        Sprite.delete(this.glow)
        BatchMesh.delete(this.sphere)
        Line.delete(this.trail)
        this.parent.pool.push(this)
    }
}

export class ProjectileSkill extends CubeSkill {
    readonly pool: Projectile[] = []
    readonly damageType: DamageType = DamageType.Kinetic
    damage: number = 1
    range: number = 4
    indicator: IUnitAttribute = { capacity: 4, amount: 4 }

    private readonly pivot: vec3 = vec3(0,1.8,0)
    private bulge: Sprite
    private flash: Sprite
    private core: Sprite
    private light: PointLight
    private particles: ParticleEmitter

    public update(): void { this.indicator.amount = this.indicator.capacity }
    protected clear(): void { if(this.indicator.amount < this.indicator.capacity) this.cube.action.amount = 0 }
    public query(direction: Direction): vec2 | null {
        if(direction === Direction.None || !this.indicator.amount) return
        const origin = this.cube.tile, target = vec2()
        const terrain = this.context.get(TerrainSystem)
        const step = DirectionTile[direction]
        for(let i = 1; i <= this.range; i++){
            vec2.scale(step, i, target)
            vec2.add(origin, target, target)
            if(terrain.getTile(target[0], target[1]) != null) return target
        }
        return target
    }
    public *activate(target: vec2, direction: Direction): Generator<ActionSignal> {
        if(--this.indicator.amount <= 0) this.cube.action.amount = 0

        const rotationalIndex = mod(direction - this.cube.direction - this.cube.sides[this.cube.side].direction, 4)

        const worldTransform = mat4.fromRotationTranslationScale(DirectionAngle[(direction + 3) % 4], this.pivot, vec3.ONE, mat4())
        mat4.multiply(this.cube.transform.matrix, worldTransform, worldTransform)

        const origin = vec3(0,0,1.2)
        mat4.transform(origin, worldTransform, origin)

        rotate: {
            const prevRotation = quat.copy(this.mesh.armature.nodes[1].rotation, quat())
            const nextRotation = DirectionAngle[(rotationalIndex + 1) % 4]
            if(quat.angle(prevRotation, nextRotation) < 1e-3) break rotate

            const rotate = PropertyAnimation([
                { frame: 0, value: prevRotation },
                { frame: 0.2, value: nextRotation, ease: ease.quadInOut }
            ], quat.slerp)
    
            for(const duration = 0.2, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                rotate(elapsedTime, this.mesh.armature.nodes[1].rotation)
                this.mesh.armature.frame = 0
                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }

        this.light = this.context.get(PointLightPass).create([1, 0.9, 0.5])
        this.light.transform = this.context.get(TransformSystem).create(origin, DirectionAngle[(direction + 3) % 4])

        this.bulge = Sprite.create(BillboardType.Sphere)
        this.bulge.material = SharedSystem.materials.distortion.particle
        this.bulge.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(PostEffectPass).add(this.bulge)

        this.core = Sprite.create(BillboardType.Sphere)
        this.core.material = SharedSystem.materials.sprite.rays
        this.core.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(ParticleEffectPass).add(this.core)

        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = SharedSystem.materials.effect.flashYellow
        this.flash.transform = this.context.get(TransformSystem).create()
        this.flash.transform.parent = this.light.transform
        this.context.get(ParticleEffectPass).add(this.flash)

        this.particles = SharedSystem.particles.embers.add({
            uLifespan: [0.1,0.4,-0.1,0],
            uOrigin: mat4.transform([0,0,2.0], worldTransform, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.1,0.6],
            uRadius: [0,0.4],
            uOrientation: quat.axisAngle(quat.transform(vec3.AXIS_Z, DirectionAngle[direction], vec3()), 0.5 * Math.PI, quat()),
            uForce: [2+6,10+6],
            uTarget: mat4.transformNormal([0,0,-2], worldTransform, vec3())
        })

        const animate = AnimationTimeline(this, actionTimeline)
        const rotated = ModelAnimation(`activate${rotationalIndex}`)

        const projectile = this.pool.pop() || new Projectile(this.context, this)
        this.context.get(TurnBasedSystem).enqueue(projectile.play(worldTransform, target), true)

        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            rotated(elapsedTime, this.mesh.armature)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.embers.remove(this.particles)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.bulge.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(PostEffectPass).remove(this.bulge)
        Sprite.delete(this.flash)
        Sprite.delete(this.core)
        Sprite.delete(this.bulge)
    }
}