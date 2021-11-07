import { mat4, quat, vec2, vec3, vec4, mod, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem, Transform } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, MeshSystem, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, SpriteMaterial, MeshMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { Cube, Direction, DirectionAngle, DirectionTile } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'
import { UnitSkill, DamageType } from '../military'
import { IAgent, TurnBasedSystem } from '../common'

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

class CorrosiveOrb extends UnitSkill {
    static readonly pool: CorrosiveOrb[] = []
    readonly tile: vec2 = vec2()
    readonly damageType: DamageType = DamageType.Corrosion
    damage: number = 1
    range: number = 2

    private orb: Mesh
    private aura: Sprite
    private decal: Decal
    private transform: Transform
    private fire: ParticleEmitter
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.transform.position)
        this.transform.position[1] += 1

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.material = SharedSystem.materials.corrosionMaterial
        this.decal.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ZERO, this.transform)

        this.orb = Mesh.create(SharedSystem.geometry.sphereMesh, 4, 8)
        this.context.get(MeshSystem).list.push(this.orb)
        this.orb.material = SharedSystem.materials.orbMaterial
        this.orb.transform = this.context.get(TransformSystem).create()
        this.orb.transform.parent = this.transform

        this.aura = Sprite.create(BillboardType.Sphere, 4)
        this.aura.material = SharedSystem.materials.auraTealMaterial
        this.aura.transform = this.context.get(TransformSystem).create()
        this.aura.transform.parent = this.transform
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
        this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.aura.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.context.get(DecalPass).delete(this.decal)
        this.orb = this.aura = null
        SharedSystem.particles.fire.remove(this.fire)
        CorrosiveOrb.pool.push(this)
    }
    public *appear(origin: vec3): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'decal.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [8,8,8], ease: ease.quadOut }
            ], vec3.lerp),
            'aura.transform.parent.position': PropertyAnimation([
                { frame: 0, value: origin },
                { frame: 1, value: vec3.copy(this.aura.transform.parent.position, vec3()), ease: ease.sineInOut }
            ], vec3.lerp),
            'aura.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [4,4,4], ease: ease.elasticOut(1,0.5) }
            ], vec3.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [1,1,1], ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp),
            'fire.rate': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 0.2, value: 0.36, ease: ease.stepped }
            ], lerp)
        })

        for(const duration = 1.0, startTime = this.context.currentTime + 0.8; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    }
    public *dissolve(): Generator<ActionSignal> {
        this.fire.rate = 0
        const animate = AnimationTimeline(this, {
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

export class OrbSkill extends CubeSkill implements IAgent {
    readonly order: number = 4
    readonly list: CorrosiveOrb[] = []

    private cone: BatchMesh
    private glow: Sprite
    private ring: Sprite
    private sphere: BatchMesh
    private distortion: Sprite
    private particles: ParticleEmitter

    constructor(context: Application, cube: Cube){
        super(context, cube)
        this.context.get(TurnBasedSystem).add(this)
    }
    public execute(): Generator<ActionSignal> {
        return null
    }
    public query(): vec2 {
        const step = DirectionTile[mod(this.direction+2,4)]
        const target = vec2.scale(step, 2, vec2())
        return vec2.add(this.cube.tile, target, target)
    }
    public *activate(target: vec2): Generator<ActionSignal> {
        const orientation = DirectionAngle[mod(this.direction + 3, 4)]
        const transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, orientation, vec3.ONE, this.cube.transform)

        this.cone = BatchMesh.create(SharedSystem.geometry.funnel)
        this.cone.material = SharedSystem.materials.coneTealMaterial
        this.cone.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y, orientation, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.sphere = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.sphere.material = SharedSystem.materials.coneTealMaterial
        this.sphere.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.HALF_X, vec3.ONE, transform)
        this.sphere.transform.parent = transform
        quat.axisAngle(vec3.AXIS_X, 0.5*Math.PI, this.sphere.transform.rotation)
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

        if(this.list.length > 0) this.context.get(AnimationSystem).start(this.list[0].dissolve(), true)

        const orb = CorrosiveOrb.pool.pop() || new CorrosiveOrb(this.context)
        this.list.push(orb)
        orb.place(target[0], target[1])
        const origin = quat.transform([0,1,-3], transform.rotation, vec3())
        vec3.add(this.cube.transform.position, origin, origin)
        this.context.get(TurnBasedSystem).enqueue(orb.appear(origin), true)
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