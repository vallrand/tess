import { Application } from '../../engine/framework'
import { randomFloat, moddelta, clamp, mod, mat4, quat, vec2, vec3, vec4, cubicBezier3D } from '../../engine/math'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, FollowPath, ease } from '../../engine/animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { AudioSystem } from '../../engine/audio'
import { Sprite, BillboardType, MeshSystem, Mesh, BatchMesh, Line } from '../../engine/components'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { TurnBasedSystem, DirectionAngle, Direction } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'
import { DamageType, IUnitAttribute, Unit } from '../military'

const steeringTimeline = {
    'burn.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,4,0] },
        { frame: 0.4, value: [8,4,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'burn.color': PropertyAnimation([
        { frame: 0, value: [0,0,0,1] },
        { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.6, value: [12,12,12], ease: ease.quartOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.6, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),

    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,2,0] },
        { frame: 0.8, value: [6,2,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: [0.3,0.3,0.4,1] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'pillar.transform.scale': PropertyAnimation([
        { frame: 0, value: [1,0,1] },
        { frame: 0.4, value: [2,6,2], ease: ease.quartOut },
        { frame: 0.8, value: vec3.ZERO, ease: ease.quadIn }
    ], vec3.lerp),
    'pillar.color': PropertyAnimation([
        { frame: 0, value: [0.6,0.6,0.8,0.2] },
        { frame: 0.4, value: [0.18,0.16,0.2,1], ease: ease.sineIn },
        { frame: 0.8, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.3, value: [4.4,4.4,4.4], ease: ease.quintOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0, value: [1,0.9,0.8,0.2] },
        { frame: 0.3, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp)
}

class Missile {
    readonly origin: vec3 = vec3()
    readonly target: vec3 = vec3()
    readonly normal: vec3 = vec3()
    private head: Mesh
    private trail: Line
    private exhaust: BatchMesh
    private smoke: ParticleEmitter
    private embers: ParticleEmitter
    private burn: Decal
    private ring: BatchMesh
    private wave: Sprite
    private pillar: Sprite
    private flash: Sprite
    constructor(private readonly context: Application, private readonly parent: ArtillerySkill){}
    *launch(target: vec2, index: number): Generator<ActionSignal> {
        for(const endTime = this.context.currentTime + 0.6; this.context.currentTime < endTime;)
            yield ActionSignal.WaitNextFrame

        this.context.get(TerrainSystem).tilePosition(target[0], target[1], this.target)

        this.head = this.context.get(MeshSystem).loadModel('missile')
        this.head.transform = this.context.get(TransformSystem).create()
        vec3.copy(this.origin, this.head.transform.position)
        quat.fromNormal(this.normal, vec3.AXIS_Y, this.head.transform.rotation)
        quat.normalize(this.head.transform.rotation, this.head.transform.rotation)

        this.trail = Line.create(16, 4, 0.4, ease.cubicFadeInOut, true)
        this.trail.material = SharedSystem.materials.effect.trailSmoke
        this.context.get(ParticleEffectPass).add(this.trail)

        this.exhaust = BatchMesh.create(SharedSystem.geometry.hemisphere, 2)
        this.exhaust.material = SharedSystem.materials.effect.exhaust
        this.exhaust.transform = this.context.get(TransformSystem).create()
        this.exhaust.transform.parent = this.head.transform
        vec3.set(0.24,0.24,1.2, this.exhaust.transform.scale)
        this.context.get(ParticleEffectPass).add(this.exhaust)

        this.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [1,1.5,-0.8,0],
            uOrigin: vec3.add(this.origin, vec3.scale(this.normal, -0.5, vec3()), vec3()),
            uGravity: [0,3.6,0],
            uRotation: [0,2*Math.PI],
            uSize: [1,2],
            uFieldDomain: [0.5,0.5,0.5,0],
            uFieldStrength: [6,0]
        })

        this.embers = SharedSystem.particles.embers.add({
            uLifespan: [0.3,0.5,-0.04,0],
            uOrigin: vec3.add(this.origin, vec3.scale(this.normal, -1, vec3()), vec3()),
            uRadius: [0,0.04],
            uOrientation: quat.rotation(vec3.AXIS_Y, this.normal, quat()),
            uGravity: vec3.ZERO,
            uRotation: vec2.ZERO,
            uSize: [0.2,0.7],
            uForce: [8,14],
            uTarget: vec3.scale(this.normal, -0.2, vec3()),
        })

        this.burn = this.context.get(DecalPass).create(0)
        this.burn.transform = this.context.get(TransformSystem).create()
        vec3.copy(this.target, this.burn.transform.position)
        quat.axisAngle(vec3.AXIS_Y, randomFloat(0, 2 * Math.PI, SharedSystem.random()), this.burn.transform.rotation)
        this.burn.material = SharedSystem.materials.decal.rays

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.distortion.wave
        this.wave.transform = this.context.get(TransformSystem).create()
        vec3.add([0,1,0], this.target, this.wave.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.wave.transform.rotation)
        this.context.get(PostEffectPass).add(this.wave)

        this.ring = BatchMesh.create(SharedSystem.geometry.cylinder, 6)
        this.ring.material = SharedSystem.materials.effect.ringDust
        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(this.target, this.ring.transform.position)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.material = SharedSystem.materials.sprite.dust
        this.pillar.transform = this.context.get(TransformSystem).create()
        vec3.copy(this.target, this.pillar.transform.position)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = SharedSystem.materials.sprite.ring
        this.flash.transform = this.context.get(TransformSystem).create()
        vec3.add(vec3.AXIS_Y, this.target, this.flash.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.flash.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.flash)

        const { path, intervals } = this.buildPath(this.target, 5)
        const travelDuration = 1.0 + 0.25 * index
        const curve = FollowPath.spline(path, intervals.map(i => travelDuration * i - travelDuration), {
            ease: ease.CubicBezier(0.5,0.5,1,0.5),
            tension: 0.5
        })

        const damage = EventTrigger([{ frame: 0, value: target }], CubeSkill.damage)
        const animate = AnimationTimeline(this, {
            ...steeringTimeline,
            'embers': EventTrigger([{ frame: -travelDuration, value: 16 }], EventTrigger.emit),
            'smoke': EventTrigger([{ frame: -travelDuration, value: 24 }], EventTrigger.emit),
            'trail': FollowPath.Line(curve, { length: 0.08 }),
            'head.transform': FollowPath(curve)
        })
        this.context.get(AudioSystem).create(`assets/cube_8_hit.mp3`, 'sfx', this.head.transform).play(travelDuration - 0.3)

        for(const duration = 1, startTime = this.context.currentTime + travelDuration; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this.parent)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.embers.remove(this.embers)
        SharedSystem.particles.smoke.remove(this.smoke)
        this.context.get(TransformSystem).delete(this.head.transform)
        this.context.get(TransformSystem).delete(this.exhaust.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(MeshSystem).delete(this.head)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(ParticleEffectPass).remove(this.exhaust)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.flash)
        Sprite.delete(this.pillar)
        Sprite.delete(this.flash)
        Sprite.delete(this.wave)
        BatchMesh.delete(this.ring)
        BatchMesh.delete(this.exhaust)
        Line.delete(this.trail)
        this.parent.pool.push(this)
    }
    private buildPath(target: vec3, length: number): { path: vec3[], intervals: number[] } {
        const path = [this.origin], intervals = [0]
        const control0 = vec3.scale(this.normal, 1, vec3())
        vec3.add(this.origin, control0, control0)

        const control1 = vec3.scale(this.normal, 3, vec3())
        vec3.add(control0, control1, control1)

        const control2 = vec3.subtract(target, control1, vec3())
        const dot0 = vec3.dot(this.normal, control2)
        vec3.scale(this.normal, dot0, control2)
        vec3.subtract(target, control2, control2)

        const heightRange = vec2(1, Math.max(0, this.origin[1]) + 6), offset = vec3()
        for(let distance = 0, i = 0; i <= length; i++){
            const prev = path[path.length - 1]
            const next = cubicBezier3D(control0, control1, control2, target, i / length, vec3())
            path.push(next)
            vec3.random(SharedSystem.random(), SharedSystem.random(), offset)
            vec3.scale(offset, SharedSystem.random() * (i == 0 || i == length ? 0 : 1), offset)
            vec3.add(next, offset, next)
            next[1] = clamp(next[1], heightRange[0], heightRange[1])

            intervals.push(distance += Math.sqrt(vec3.distanceSquared(prev, next)))
        }
        path.push(vec3.subtract(target, [0,2,0], vec3()))
        intervals.push(intervals[intervals.length - 1] + 1/length)
        for(let i = intervals.length - 1, scale = 1 / intervals[i]; i >= 0; i--) intervals[i] *= scale
        return { path, intervals }
    }
}

export class ArtillerySkill extends CubeSkill {
    indicator: IUnitAttribute = { capacity: 2, amount: 2 }
    readonly pool: Missile[] = []
    readonly pivots = [
        vec3(-1.0, 4.4, -2.1),
        vec3(-1.6, 3.8, -2.1),
        vec3(-1.0, 4.4, 2.1),
        vec3(-1.6, 3.8, 2.1)
    ]
    readonly damageType: DamageType = DamageType.Kinetic
    damage: number = 1
    range: number = 4
    public update(): void { this.indicator.amount = this.indicator.capacity }
    protected clear(): void { if(this.indicator.amount < this.indicator.capacity) this.cube.action.amount = 0 }
    public query(direction: Direction): vec2[] | null {
        if(direction === Direction.None || !this.indicator.amount) return
        const origin = this.cube.tile
        const forward = -(direction - 1) * 0.5 * Math.PI
        const candidates = CubeSkill.queryArea(this.context, origin, this.minRange, this.range, 2)
        const out: vec2[] = []
        for(let i = 4; i > 0; i--){
            let index = -1, min = Infinity
            for(let j = candidates.length - 1; j >= 0; j--){
                const target = candidates[j]
                const angle = moddelta(2*Math.PI,forward, Math.atan2(target[1]-origin[1], target[0]-origin[0]))
                const distance = vec2.distance(origin, target) / this.range
                const heuristic = angle + distance
                if(heuristic >= min) continue
                min = heuristic
                index = j
            }
            if(index != -1) out.push(candidates.splice(index, 1)[0])
            else{
                const distance = randomFloat(Math.SQRT2, this.range, SharedSystem.random())
                const angle = forward + Math.PI * randomFloat(-0.5, 0.5, SharedSystem.random())
                const tile = vec2(
                    Math.cos(angle) * distance | 0,
                    Math.sin(angle) * distance | 0
                )
                vec2.add(origin, tile, tile)
                const entity = this.context.get(TerrainSystem).getTile<Unit>(tile[0], tile[1])
                if(entity && entity instanceof Unit) i++
                else out.push(tile)
            }
        }
        return out
    }
    public *activate(targets: vec2[], direction: Direction): Generator<ActionSignal> {
        if(--this.indicator.amount <= 0) this.cube.action.amount = 0

        const animate = AnimationTimeline(this, {
            'mesh.armature': ModelAnimation('activate'),
            'mesh.armature.nodes.1.rotation': PropertyAnimation([
                { frame: 0, value: quat.copy(this.mesh.armature.nodes[1].rotation, quat()) },
                { frame: 0.6, value: DirectionAngle[mod(direction - this.direction - 3, 4)], ease: ease.quadInOut }
            ], quat.slerp)
        })

        for(let i = 0; i < this.pivots.length; i++){
            const missile = this.pool.pop() || new Missile(this.context, this)
            vec3.copy(this.pivots[i], missile.origin)
            vec3.normalize([-1,1,0], missile.normal)
            quat.transform(missile.origin, DirectionAngle[direction], missile.origin)
            mat4.transform(missile.origin, this.cube.transform.matrix, missile.origin)
            quat.transform(missile.normal, DirectionAngle[direction], missile.normal)
            this.context.get(TurnBasedSystem).enqueue(missile.launch(targets[i], i), true)
        }
        this.context.get(AudioSystem).create(`assets/${this.mesh.armature.key}_use.mp3`, 'sfx', this.mesh.transform).play(0)

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    }
    public *close(): Generator<ActionSignal> {
        const mesh = this.mesh
        const rotate = PropertyAnimation([
            { frame: 0, value: quat.copy(mesh.armature.nodes[1].rotation, quat()) },
            { frame: 0.4, value: quat.IDENTITY, ease: ease.quadInOut }
        ], quat.slerp)

        for(const generator = super.close(), startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            rotate(elapsedTime, mesh.armature.nodes[1].rotation)
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
    }
}