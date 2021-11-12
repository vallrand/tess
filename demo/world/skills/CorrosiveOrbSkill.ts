import { quat, vec2, vec3, vec4, mod, lerp } from '../../engine/math'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem, Transform } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, MeshSystem, Mesh, BatchMesh } from '../../engine/components'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { TurnBasedSystem, DirectionAngle, DirectionTile } from '../player'
import { TerrainSystem } from '../terrain'
import { UnitSkill, DamageType, IUnitAttribute } from '../military'
import { CubeSkill } from './CubeSkill'
import { CorrosionPhase, IUnitOrb } from './CorrosionPhase'

class CorrosiveOrb extends UnitSkill implements IUnitOrb {
    static readonly pool: CorrosiveOrb[] = []
    readonly tile: vec2 = vec2()
    readonly direction: vec2 = vec2()
    readonly damageType: DamageType = DamageType.Corrosion | DamageType.Immobilize
    readonly health: IUnitAttribute = { capacity: 4, amount: 0 }
    readonly group: number = 2
    readonly range: number = 2
    damage: number = 1

    private orb: Mesh
    private aura: Sprite
    private decal: Decal
    private transform: Transform
    private fire: ParticleEmitter
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.health.amount = this.health.capacity
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.transform.position)
        vec3.add(vec3.AXIS_Y, this.transform.position, this.transform.position)

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.material = SharedSystem.materials.corrosionMaterial
        this.decal.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ZERO, this.transform)

        this.orb = this.context.get(MeshSystem).create(SharedSystem.geometry.sphereMesh, 4, 8)
        this.orb.material = SharedSystem.materials.mesh.orb
        this.orb.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.transform)

        this.aura = Sprite.create(BillboardType.Sphere, 4)
        this.aura.material = SharedSystem.materials.effect.auraTeal
        this.aura.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.transform)
        this.context.get(ParticleEffectPass).add(this.aura)

        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.8,1.0,0,0),
            uOrigin: this.transform.position,
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: vec2(1,3),
            uRadius: vec2(0.8,1.2)
        })
    }
    public delete(): void {
        this.transform = void this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.aura.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.decal = void this.context.get(DecalPass).delete(this.decal)
        this.aura = void Sprite.delete(this.aura)
        this.orb = void this.context.get(MeshSystem).delete(this.orb)
        this.fire = void SharedSystem.particles.fire.remove(this.fire)
        CorrosiveOrb.pool.push(this)
    }
    public *move(target: vec2): Generator<ActionSignal> {
        const prevPosition = vec3.copy(this.transform.position, vec3())
        const nextPosition = this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], vec3())
        vec3.add(vec3.AXIS_Y, nextPosition, nextPosition)

        const animate = AnimationTimeline(this, {
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.copy(this.orb.transform.scale, vec3()) },
                { frame: 1, value: target ? [0.5,0.5,0.5] : vec3.ONE, ease: ease.cubicIn }
            ], vec3.lerp),
            'transform.position': PropertyAnimation([
                { frame: 0, value: prevPosition },
                { frame: 1, value: nextPosition, ease: ease.quadInOut }
            ], vec3.lerp),
            'fire.uniform.uniforms.uOrigin': PropertyAnimation([
                { frame: 0, value: prevPosition },
                { frame: 1, value: nextPosition, ease: ease.quadInOut }
            ], vec3.lerp)
        })
        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        if(target) UnitSkill.damage(this, this.tile)
    }
    public *appear(origin: vec3, delay: number): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'decal.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [8,8,8], ease: ease.quadOut }
            ], vec3.lerp),
            'transform.position': PropertyAnimation([
                { frame: 0, value: origin },
                { frame: 1, value: vec3.copy(this.transform.position, vec3()), ease: ease.sineInOut }
            ], vec3.lerp),
            'aura.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [4,4,4], ease: ease.elasticOut(1,0.5) }
            ], vec3.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: vec3.ONE, ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp),
            'fire.rate': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 0.2, value: 0.36, ease: ease.stepped }
            ], lerp)
        })

        for(const duration = 1.0, startTime = this.context.currentTime + delay; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        UnitSkill.damage(this, this.tile)
    }
    public *dissolve(): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'fire.rate': PropertyAnimation([
                { frame: 0, value: 0 }
            ], lerp),
            'decal.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: [1,1,1,0], ease: ease.sineOut }
            ], vec4.lerp),
            'aura.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: vec4.ZERO, ease: ease.sineOut }
            ], vec4.lerp),
            'orb.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        this.delete()
    }
}

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'particles': EventTrigger([{ frame: 0.2, value: 48 }], EventTrigger.emit),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0, value: [0.2,0.2,1] },
        { frame: 0.6, value: vec3.ONE, ease: ease.sineOut },
        { frame: 0.8, value: [0,0,2], ease: ease.quartIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.6, value: vec4.ONE, ease: ease.quadOut },
        { frame: 0.8, value: [1,0,1,0], ease: ease.cubicIn }
    ], vec4.lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 0.5, value: vec3.ZERO },
        { frame: 0.8, value: [8,8,8], ease: ease.quartOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 0.5, value: [0.7,1,0.9,0] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [6,6,6], ease: ease.quadIn },
        { frame: 1.6, value: [12,12,12], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-1] },
        { frame: 1.6, value: [0,0,-3], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0, value: [0,0,0,1] },
        { frame: 0.8, value: [0,0,-1,0], ease: ease.quadIn },
        { frame: 1.6, value: [0,0,0,-1], ease: ease.quadOut }
    ], quat.slerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,1,0.9,0] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),
    'sphere.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-2] },
        { frame: 0.7, value: [0,0,-2.8], ease: ease.quadInOut }
    ], vec3.lerp),
    'sphere.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [2,2,2], ease: ease.quadIn },
        { frame: 1.0, value: [0,3,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.transform.scale': PropertyAnimation([
        { frame: 0.7, value: [16,16,16] },
        { frame: 0.9, value: vec3.ZERO, ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.color': PropertyAnimation([
        { frame: 0.7, value: vec4.ZERO },
        { frame: 0.9, value: [1,1,0.5,0.5], ease: ease.sineOut }
    ], vec4.lerp)
}





export class CorrosiveOrbSkill extends CubeSkill {
    public readonly corrosion: CorrosionPhase = new CorrosionPhase(this.context)

    private cone: BatchMesh
    private glow: Sprite
    private ring: Sprite
    private sphere: BatchMesh
    private distortion: Sprite
    private particles: ParticleEmitter

    public query(): vec2 {
        const step = DirectionTile[mod(this.direction+2,4)]
        const target = vec2.scale(step, 2, vec2())
        return vec2.add(this.cube.tile, target, target)
    }
    public *activate(target: vec2): Generator<ActionSignal> {
        this.cube.action.amount = 0

        const orientation = DirectionAngle[mod(this.direction + 3, 4)]
        const transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, orientation, vec3.ONE, this.cube.transform)

        this.cone = BatchMesh.create(SharedSystem.geometry.funnel)
        this.cone.material = SharedSystem.materials.effect.coneTeal
        this.cone.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y, orientation, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.sphere = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.sphere.material = SharedSystem.materials.effect.coneTeal
        this.sphere.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.HALF_X, vec3.ONE, transform)
        this.context.get(ParticleEffectPass).add(this.sphere)

        this.glow = Sprite.create(BillboardType.Sphere, -8)
        this.glow.material = SharedSystem.materials.sprite.sparkle
        this.glow.transform = this.context.get(TransformSystem).create([0,0,-3], quat.IDENTITY, vec3.ONE, transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.distortion = Sprite.create(BillboardType.None)
        this.distortion.material = SharedSystem.materials.distortion.wave
        this.distortion.transform = this.context.get(TransformSystem).create([0,0,-2], quat.IDENTITY, vec3.ONE, transform)
        this.context.get(PostEffectPass).add(this.distortion)

        this.particles = SharedSystem.particles.sparks.add({
            uLifespan: [0.5,0.8,-0.5,0],
            uOrigin: vec3.add(vec3.AXIS_Y, this.cube.transform.position, vec3()),
            uLength: [0.2,0.5],
            uGravity: quat.transform([0,0,10], orientation, vec3()),
            uSize: [0.2,0.8],
            uRadius: [0,0.5],
            uForce: [6,10],
            uTarget: quat.transform([0,-0.2,0.5], orientation, vec3())
        })

        const orb = CorrosiveOrb.pool.pop() || new CorrosiveOrb(this.context)
        orb.direction[0] = Math.sign(target[0] - this.cube.tile[0])
        orb.direction[1] = Math.sign(target[1] - this.cube.tile[1])
        orb.place(target[0], target[1])
        this.corrosion.add(orb)
        const origin = quat.transform([0,1,-3], transform.rotation, vec3())
        vec3.add(this.cube.transform.position, origin, origin)
        this.context.get(TurnBasedSystem).enqueue(orb.appear(origin, 0.8), true)

        const animate = AnimationTimeline(this, actionTimeline)
        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.sphere.transform)
        this.context.get(TransformSystem).delete(this.distortion.transform)

        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.sphere)
        this.context.get(PostEffectPass).remove(this.distortion)

        SharedSystem.particles.bolts.remove(this.particles)
        BatchMesh.delete(this.cone)
        BatchMesh.delete(this.sphere)
        Sprite.delete(this.glow)
        Sprite.delete(this.ring)
        Sprite.delete(this.distortion)
    }
}