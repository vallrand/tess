import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, Sprite, BillboardType, BatchMesh, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ParticleEmitter } from '../../../engine/particles'
import { PointLightPass, PointLight, ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType, AIStrategy } from '../../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activateVariant'),
    'light.radius': PropertyAnimation([
        { frame: 1.1, value: 0 },
        { frame: 1.7, value: 6, ease: ease.quadOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 1.1, value: 8 },
        { frame: 1.7, value: 0, ease: ease.sineIn }
    ], lerp),
    'fire': EventTrigger([
        { frame: 1.0, value: 48 }
    ], EventTrigger.emit),
    'wave.transform.scale': PropertyAnimation([
        { frame: 1.2, value: vec3.ZERO },
        { frame: 1.6, value: [8,8,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 1.2, value: vec4.ONE },
        { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 1.0, value: vec3.ZERO },
        { frame: 1.6, value: [3,3,3], ease: ease.cubicOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 1.0, value: [0.2,1,0.6,1] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'circle.transform.scale': PropertyAnimation([
        { frame: 1.0, value: vec3.ZERO },
        { frame: 1.4, value: [6,6,6], ease: ease.quartOut }
    ], vec3.lerp),
    'circle.color': PropertyAnimation([
        { frame: 1.0, value: [0.6,1,1,0] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'pillar.transform.scale': PropertyAnimation([
        { frame: 0, value: [2,0,2] },
        { frame: 0.5, value: [1,3,1], ease: ease.quadOut },
        { frame: 0.8, value: [0,4,0], ease: ease.quadIn }
    ], vec3.lerp),
    'pillar.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.5, value: [0.4,1,0.8,1], ease: ease.cubicOut }
    ], vec4.lerp),
    'muzzle.transform.scale': PropertyAnimation([
        { frame: 0.7, value: [0,-1,0] },
        { frame: 1.1, value: [0.6,-2.8,0.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'muzzle.color': PropertyAnimation([
        { frame: 0.7, value: [0.4,1,0.8,0] },
        { frame: 1.1, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [3,3,3], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.8, value: [0.4,1,0.9,1] },
        { frame: 1.4, value: [0,1,0.5,0.2], ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.7, value: vec3.ZERO },
        { frame: 1.0, value: [4,4,4], ease: ease.quadOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.7, value: [0.6,1,1,0] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

export class ProjectileSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 5
    readonly cardinal: boolean = true
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Kinetic | DamageType.Corrosion
    readonly damage: number = 1

    public validate(origin: vec2, target: vec2): boolean {
        return super.validate(origin, target) && AIStrategy.lineOfSight(this.context.get(TerrainSystem).pathfinder, origin, target)
    }

    private ring: Sprite
    private flash: Sprite
    private pillar: BatchMesh
    private muzzle: BatchMesh
    private fire: ParticleEmitter
    private light: PointLight
    private trail: Line
    private core: BatchMesh
    private wave: Sprite
    private circle: Sprite
    private mesh: Mesh
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        const orientation = quat.axisAngle(vec3.AXIS_Y, Math.atan2(target[0] - source.tile[0], target[1] - source.tile[1]), quat())
        const transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, orientation, vec3.ONE, this.mesh.transform)
    
        this.pillar = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.pillar.material = SharedSystem.materials.effect.stripesRed
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,1.8,0], quat.HALF_X, vec3.ONE, transform)
        this.context.get(ParticleEffectPass).add(this.pillar)
    
        this.muzzle = BatchMesh.create(SharedSystem.geometry.cone)
        this.muzzle.material = SharedSystem.materials.sprite.streak
        this.muzzle.transform = this.context.get(TransformSystem)
        .create([0,1.8,1.2],quat.HALF_X,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.muzzle)
    
        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = SharedSystem.materials.effect.flashYellow
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,1.8,1.8],quat.IDENTITY,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.flash)
    
        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,1.8,2],quat.IDENTITY,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.ring)
    
        this.trail = Line.create(8, 0, 0.8, ease.reverse(ease.quadIn), true)
        this.trail.material = SharedSystem.materials.sprite.lineTeal
        this.context.get(ParticleEffectPass).add(this.trail)
    
        const originPosition = mat4.transform([0,1.8,0], this.mesh.transform.matrix, vec3())
        const targetPosition = this.context.get(TerrainSystem).tilePosition(target[0], target[1], vec3())
    
        this.light = this.context.get(PointLightPass).create([0.4,1,0.9])
        this.light.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,1,0], targetPosition, vec3()))
    
        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.4,0.8,-0.2,0),
            uOrigin: vec3.add([0,0.5,0], targetPosition, vec3()),
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: vec2(1,3),
            uRadius: vec2(0.8,1.4)
        })
    
        this.wave = Sprite.create(BillboardType.Sphere)
        this.wave.material = SharedSystem.materials.displacement.bulge
        this.wave.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(PostEffectPass).add(this.wave)
    
        this.core = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.core.material = SharedSystem.materials.effect.energyPurple
        this.core.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(ParticleEffectPass).add(this.core)
    
        this.circle = Sprite.create(BillboardType.None)
        this.circle.material = SharedSystem.materials.sprite.burst
        this.circle.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], targetPosition, vec3()), quat.HALF_X)
        this.context.get(ParticleEffectPass).add(this.circle)
    
        const damage = EventTrigger([{ frame: 1.0, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, {
            'mesh.armature.nodes.0.rotation': PropertyAnimation([
                { frame: 0, value: quat.copy(this.mesh.armature.nodes[0].rotation, quat()) },
                { frame: 0.5, value: quat.multiply(quat.axisAngle(vec3.AXIS_Y, -0.5* Math.PI,quat()), orientation, quat()), ease: ease.quadInOut }
            ], quat.slerp),
            'trail': FollowPath.Line(FollowPath.separate(
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[0] },
                    { frame: 1.0, value: targetPosition[0], ease: ease.linear }
                ], lerp),
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[1] },
                    { frame: 1.0, value: targetPosition[1], ease: ease.cubicIn }
                ], lerp),
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[2] },
                    { frame: 1.0, value: targetPosition[2], ease: ease.linear }
                ], lerp)
            ), { length: 0.06 }),
            ...actionTimeline
        })
        this.context.get(AudioSystem).create(`assets/cannon_use.mp3`, 'sfx', this.mesh.transform).play(0.6)
        this.context.get(AudioSystem).create(`assets/cannon_hit.mp3`, 'sfx', this.light.transform).play(1)
    
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    
        this.context.get(TransformSystem).delete(transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.muzzle.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.circle.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        SharedSystem.particles.fire.remove(this.fire)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.muzzle)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.circle)
        this.context.get(ParticleEffectPass).remove(this.core)
        Sprite.delete(this.ring)
        Sprite.delete(this.flash)
        Sprite.delete(this.wave)
        Sprite.delete(this.circle)
        BatchMesh.delete(this.pillar)
        BatchMesh.delete(this.muzzle)
        BatchMesh.delete(this.core)
        Line.delete(this.trail)
    }
}