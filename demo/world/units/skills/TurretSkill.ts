import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4, moddelta } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ParticleEffectPass, PointLightPass, PointLight } from '../../../engine/pipeline'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType, AIStrategy } from '../../military'

const actionTimeline = {
    'dust.transform.scale': PropertyAnimation([
        { frame: 0.7, value: vec3.ZERO },
        { frame: 1.2, value: [1.6,4,1.6], ease: ease.quartOut }
    ], vec3.lerp),
    'dust.color': PropertyAnimation([
        { frame: 0.7, value: [0,0.1,0.1,1] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
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
}

class Turret {
    public readonly angle: number
    public readonly maxAngle: number = 0.25*Math.PI
    private trailLeft: Line
    private trailRight: Line
    private dust: Sprite
    private flashLeft: Sprite
    private flashRight: Sprite
    private light: PointLight
    private ring: Sprite
    private wave: BatchMesh
    private sparks: ParticleEmitter
    private mesh: Mesh
    constructor(
        private readonly context: Application,
        private readonly skill: AIUnitSkill,
        readonly key: string,
        readonly index: number,
        readonly tile: vec2
    ){
        this.angle = Math.atan2(tile[0] - 1, tile[1] - 1)
    }
    public validate(origin: vec2, target: vec2): boolean {
        const dx = target[0] - origin[0] - this.tile[0]
        const dy = target[1] - origin[1] - this.tile[1]
        if(dx*dx + dy*dy > this.skill.range*this.skill.range) return false
        if(Math.abs(moddelta(2*Math.PI,this.angle, Math.atan2(dx, dy))) > this.maxAngle) return false
        return true
    }
    public *activate(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        const originPosition = mat4.transform(vec3.ZERO, this.mesh.armature.nodes[this.index].globalTransform, vec3())
        vec3.add(this.mesh.transform.position, originPosition, originPosition)
        const targetPosition = this.context.get(TerrainSystem).tilePosition(target[0], target[1], vec3())
        const direction = vec3.subtract(targetPosition, originPosition, vec3())
        
        if(!this.validate(source.tile, target)) return
        const origin = vec2.add(this.tile, source.tile, vec2())
        if(!AIStrategy.lineOfSight(this.context.get(TerrainSystem).pathfinder, origin, target)) return

        const originRotation = quat.axisAngle(vec3.AXIS_Y, this.angle, quat())
        const targetRotation = quat.fromNormal(vec3.normalize(direction, vec3()), vec3.AXIS_Y, quat())
        
        this.dust = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.dust.material = SharedSystem.materials.sprite.dust
        this.dust.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(ParticleEffectPass).add(this.dust)

        this.trailLeft = Line.create(2, 0, 0.3, ease.reverse(ease.quadIn), true)
        this.trailLeft.material = SharedSystem.materials.sprite.lineTeal
        this.context.get(ParticleEffectPass).add(this.trailLeft)

        this.trailRight = Line.create(2, 0, 0.3, ease.reverse(ease.quadIn), true)
        this.trailRight.material = SharedSystem.materials.sprite.lineTeal
        this.context.get(ParticleEffectPass).add(this.trailRight)

        const transformMatrix = mat4.fromRotationTranslationScale(targetRotation,originPosition,vec3.ONE,mat4())
        
        const originLeft = mat4.transform([0.25,0,1], transformMatrix, vec3())
        const originRight = mat4.transform([-0.25,0,1], transformMatrix, vec3())

        const targetLeft = vec3.add(originLeft, direction, vec3())
        const targetRight = vec3.add(originRight, direction, vec3())

        this.flashLeft = Sprite.create(BillboardType.Sphere)
        this.flashLeft.material = SharedSystem.materials.sprite.rays
        this.flashRight = Sprite.create(BillboardType.Sphere)
        this.flashRight.material = this.flashLeft.material
        this.flashLeft.transform = this.context.get(TransformSystem)
        .create(mat4.transform([0.25,0,1.5], transformMatrix, vec3()))
        this.flashRight.transform = this.context.get(TransformSystem)
        .create(mat4.transform([-0.25,0,1.5], transformMatrix, vec3()))
        this.context.get(ParticleEffectPass).add(this.flashLeft)
        this.context.get(ParticleEffectPass).add(this.flashRight)

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.8,0,0],
            uOrigin: targetPosition, uTarget: [0,-0.2,0],
            uLength: [0.1,0.2], uSize: [0.2,0.4],
            uForce: [4,12], uRadius: [0.2,0.2], uGravity: [0,-24,0],
        })

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.ring
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.add(targetPosition, [0,0.2,0], vec3()), quat.HALF_X)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.wave = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.wave.material = SharedSystem.materials.effect.ringDust
        this.wave.transform = this.context.get(TransformSystem)
        .create(targetPosition, quat.IDENTITY)
        this.context.get(ParticleEffectPass).add(this.wave)

        this.light = this.context.get(PointLightPass).create([0.4,1,0.9])
        this.light.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,1,0], targetPosition, vec3()))

        const damage = EventTrigger([{ frame: 0.6, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, {
            'mesh.armature': ModelAnimation(this.key),
            [`mesh.armature.nodes.${this.index}.rotation`]: PropertyAnimation([
                { frame: 0.0, value: originRotation },
                { frame: 0.4, value: targetRotation, ease: ease.cubicOut },
                { frame: 0.8, value: targetRotation, ease: ease.linear },
                { frame: 1.4, value: originRotation, ease: ease.quadInOut }
            ], quat.slerp),
            'trailLeft': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originLeft },
                { frame: 0.6, value: targetLeft, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            'trailRight': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originRight },
                { frame: 0.6, value: targetRight, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            ...actionTimeline
        })
        this.context.get(AudioSystem).create(`assets/turret_use.mp3`, 'sfx', this.mesh.transform).play(0.4)

        for(const duration = 1.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this.skill)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.sparks.remove(this.sparks)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.dust.transform)
        this.context.get(TransformSystem).delete(this.flashLeft.transform)
        this.context.get(TransformSystem).delete(this.flashRight.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.dust)
        this.context.get(ParticleEffectPass).remove(this.flashLeft)
        this.context.get(ParticleEffectPass).remove(this.flashRight)
        this.context.get(ParticleEffectPass).remove(this.ring)
        Sprite.delete(this.dust)
        Sprite.delete(this.flashLeft)
        Sprite.delete(this.flashRight)
        Sprite.delete(this.ring)
        BatchMesh.delete(this.wave)
        Line.delete(this.trailLeft)
        Line.delete(this.trailRight)
    }
}

export class TurretSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 4
    readonly cardinal: boolean = false
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Kinetic
    readonly damage: number = 1

    private readonly turrets: Turret[] = [
        new Turret(this.context, this, 'turret11', 10, vec2(2,0)),
        new Turret(this.context, this, 'turret01', 12, vec2(2,2)),
        new Turret(this.context, this, 'turret00', 14, vec2(0,2)),
        new Turret(this.context, this, 'turret10', 16, vec2(0,0)),
    ]
    
    public validate(origin: vec2, target: vec2): boolean {
        for(let i = this.turrets.length - 1; i >= 0; i--)
            if(this.turrets[i].validate(origin, target)) return true
    }
    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        return AnimationSystem.zip(this.turrets.map(turret => turret.activate(source, target)))
    }
}