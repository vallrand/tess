import { random, randomInt, randomFloat, shortestAngle, range, clamp, lerp, mod, ease, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { AnimationTimeline, PropertyAnimation, IAnimationTrigger, EmitterTrigger, AnimationSystem, ActionSignal } from '../../engine/scene/Animation'
import { TransformSystem, Transform } from '../../engine/scene'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { Sprite, BillboardType, MeshSystem, Mesh, BatchMesh, Line, FollowPath } from '../../engine/components'
import { DecalMaterial, EffectMaterial, ShaderMaterial, SpriteMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { shaders } from '../../engine/shaders'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube, DirectionAngle, Direction } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

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
        { frame: 0.8, value: [0,0,0,0], ease: ease.sineIn }
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
    readonly normal: vec3 = vec3()
    head: Mesh
    trail: Line
    exhaust: BatchMesh
    smoke: ParticleEmitter
    embers: ParticleEmitter
    burn: Decal
    ring: BatchMesh
    wave: Sprite
    pillar: Sprite
    flash: Sprite
    constructor(private readonly context: Application, private readonly parent: ArtillerySkill){
        this.trail = new Line()
        this.trail.order = 4
        this.trail.width = 0.4
        const cubicScale = 1/(Math.pow(1-1/3,2)*(1/3))
        this.trail.ease = x => cubicScale*Math.pow(1-x,2)*x
        this.trail.path = range(16).map(i => vec3())
        this.trail.addColorFade(this.trail.ease)
        this.trail.material = this.parent.trailMaterial

        this.exhaust = new BatchMesh(SharedSystem.geometry.hemisphere)
        this.exhaust.order = 2
        this.exhaust.material = this.parent.exhaustMaterial

        this.ring = new BatchMesh(SharedSystem.geometry.cylinder)
        this.ring.order = 6
        this.ring.material = this.parent.ringMaterial

        this.wave = new Sprite()
        this.wave.billboard = BillboardType.None
        this.wave.material = this.parent.waveMaterial

        this.pillar = new Sprite()
        this.pillar.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.pillar.origin)
        this.pillar.material = this.parent.pillarMaterial

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.None
        this.flash.material = this.parent.flashMaterial
    }
    *launch(target: vec3, index: number): Generator<ActionSignal> {
        this.head = this.context.get(MeshSystem).loadModel('missile')
        this.head.transform = this.context.get(TransformSystem).create()
        vec3.copy(this.origin, this.head.transform.position)
        quat.fromNormal(this.normal, vec3.AXIS_Y, this.head.transform.rotation)
        quat.normalize(this.head.transform.rotation, this.head.transform.rotation)

        this.context.get(ParticleEffectPass).add(this.trail)

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
            uTarget: vec3.add(this.origin, vec3.scale(this.normal, -1.2, vec3()), vec3()),
        })

        this.burn = this.context.get(DecalPass).create(0)
        this.burn.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, this.burn.transform.position)
        quat.axisAngle(vec3.AXIS_Y, randomFloat(0, 2 * Math.PI, random), this.burn.transform.rotation)
        this.burn.material = this.parent.burnMaterial

        this.wave.transform = this.context.get(TransformSystem).create()
        vec3.add([0,1,0], target, this.wave.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.wave.transform.rotation)
        this.context.get(PostEffectPass).add(this.wave)

        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, this.ring.transform.position)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.pillar.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, this.pillar.transform.position)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.flash.transform = this.context.get(TransformSystem).create()
        vec3.add(vec3.AXIS_Y, target, this.flash.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.flash.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.flash)

        const { path, intervals } = this.buildPath(target, 5)
        const travelDuration = 1.0 + 0.25 * index
        const animate = AnimationTimeline(this, {
            ...steeringTimeline,
            'embers': EmitterTrigger({ frame: -travelDuration, value: 16 }),
            'smoke': EmitterTrigger({ frame: -travelDuration, value: 24 }),
            'trail': FollowPath({
                path, length: 0.08, tension: 0.5,
                frames: intervals.map(i => travelDuration * i - travelDuration),
                ease: ease.CubicBezier(0.5,0.5,1,0.5)
            }, true),
            'head.transform': FollowPath({
                path, tension: 0.5,
                frames: intervals.map(i => travelDuration * i - travelDuration),
                ease: ease.CubicBezier(0.5,0.5,1,0.5)
            }, false)
        })

        for(const duration = travelDuration + 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime - travelDuration, this.context.deltaTime)
            
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
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

        this.parent.pool.push(this)
    }
    private buildPath(target: vec3, length: number): { path: vec3[], intervals: number[] } {
        const path = [this.origin], intervals = [0]
        const cubicBezier3D = (a: vec3, b: vec3, c: vec3, d: vec3, t: number, out: vec3): vec3 => {
            const t2 = t*t, t3 = t*t*t, it = 1-t, it2 = it*it, it3 = it2*it
            out[0] = it3 * a[0] + 3 * t * it2 * b[0] + 3 * t2 * it * c[0] + t3 * d[0]
            out[1] = it3 * a[1] + 3 * t * it2 * b[1] + 3 * t2 * it * c[1] + t3 * d[1]
            out[2] = it3 * a[2] + 3 * t * it2 * b[2] + 3 * t2 * it * c[2] + t3 * d[2]
            return out
        }
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
            vec3.random(random(), random(), offset)
            vec3.scale(offset, random() * (i == 0 || i == length ? 0 : 1), offset)
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
    pool: Missile[] = []
    readonly pivots = [
        vec3(-1.0, 4.4, -2.1),
        vec3(-1.6, 3.8, -2.1),
        vec3(-1.0, 4.4, 2.1),
        vec3(-1.6, 3.8, 2.1)
    ]
    trailMaterial: EffectMaterial<any>
    exhaustMaterial: EffectMaterial<any>
    burnMaterial: DecalMaterial
    waveMaterial: SpriteMaterial
    ringMaterial: EffectMaterial<any>
    pillarMaterial: SpriteMaterial
    flashMaterial: SpriteMaterial
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.trailMaterial = new EffectMaterial(this.context.gl, {
            PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
        }, {
            uHorizontalMask: vec4(0,0.4,0.6,1.0),
            uUVTransform: vec4(0,0,0.4,1.7),
            uUVPanning: vec2(-0.1,0.7+0.4),
            uUV2Transform: vec4(0,0,0.7,1.5),
            uUV2Panning: vec2(0.1,0.5+0.4),
            uColorAdjustment: vec3(1,0.8,0.2)
        })
        this.trailMaterial.gradient = GradientRamp(this.context.gl, [
            0xd5f5f500, 0x9c386f20, 0x42172510, 0x00000000,
            0x50505fff, 0x20202fff, 0x0a0a0fff, 0x00000000,
            0x30303fff, 0x10101fff, 0x0a0a0fff, 0x00000000,
            0x000000ff, 0x000000af, 0x0000007f, 0x00000000
        ], 4)
        this.trailMaterial.diffuse = SharedSystem.textures.cloudNoise

        this.exhaustMaterial = new EffectMaterial(this.context.gl, {
            PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
        }, {
            uVerticalMask: vec4(0,0.4,0.6,0.8),
            uUVTransform: vec4(-0.1,0,1,0.5),
            uUVPanning: vec2(-0.1,1.4),
            uUV2Transform: vec4(0,0,1,0.7),
            uUV2Panning: vec2(0.2, 1.8),
            uColorAdjustment: vec3(2.0,2.0,0.2)
        })
        this.exhaustMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffff00, 0xc5e0e300, 0x88a8bd00, 0x6e84c420, 0x4e3ba130, 0x820c4920, 0x38031510, 0x00000000
        ], 1)
        this.exhaustMaterial.diffuse = SharedSystem.textures.cellularNoise

        this.burnMaterial = new DecalMaterial()
        this.burnMaterial.program = this.context.get(DecalPass).program
        this.burnMaterial.diffuse = SharedSystem.textures.rays

        this.waveMaterial = new SpriteMaterial()
        this.waveMaterial.blendMode = null
        this.waveMaterial.program = SharedSystem.materials.chromaticAberration
        this.waveMaterial.diffuse = SharedSystem.textures.wave

        //TODO duplicate from minefield
        this.ringMaterial = new EffectMaterial(this.context.gl, {
            PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true, VERTICAL_MASK: true
        }, {
            uUVTransform: vec4(0,0,1,0.6),
            uUVPanning: vec2(-0.3,-0.04),
            uDissolveColor: vec4.ZERO,
            uDissolveThreshold: vec3(0,0.04,0),
            uColorAdjustment: vec3(1,0.64,0.1),
            uUV2Transform: vec4(0,0,1,1.7),
            uUV2Panning: vec2(-0.5,0.1),
            uVerticalMask: vec4(0.4,0.5,0.9,1.0),
        })
        this.ringMaterial.diffuse = SharedSystem.textures.cellularNoise
        this.ringMaterial.gradient = GradientRamp(this.context.gl, [
            0xf5f0d700, 0xbd7d7d00, 0x524747ff, 0x00000000,
            0x7f7f7fff, 0x202020ff, 0x000000ff, 0x00000000
        ], 2)

        this.pillarMaterial = new SpriteMaterial()
        this.pillarMaterial.program = this.context.get(ParticleEffectPass).program
        this.pillarMaterial.diffuse = SharedSystem.textures.groundDust

        this.flashMaterial = new SpriteMaterial()
        this.flashMaterial.program = this.context.get(ParticleEffectPass).program
        this.flashMaterial.diffuse = SharedSystem.textures.ring
    }
    public *activate(transform: mat4, orientation: quat, direction: Direction): Generator<ActionSignal> {
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const rotate = PropertyAnimation([
            { frame: 0, value: quat.copy(mesh.armature.nodes[1].rotation, quat()) },
            { frame: 0.6, value: DirectionAngle[mod(direction - this.direction - 3, 4)], ease: ease.quadInOut }
        ], quat.slerp)

        const targets = this.findTarget(direction)
        const missiles = this.pivots.map(pivot => {
            const missile = this.pool.pop() || new Missile(this.context, this)
            vec3.copy(pivot, missile.origin)
            vec3.normalize([-1,1,0], missile.normal)
            quat.transform(missile.origin, DirectionAngle[direction], missile.origin)
            mat4.transform(missile.origin, this.cube.transform.matrix, missile.origin)
            quat.transform(missile.normal, DirectionAngle[direction], missile.normal)
            return missile
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            rotate(elapsedTime, mesh.armature.nodes[1].rotation)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > 0.6 && missiles.length)
            for(let i = 0; missiles.length; i++){
                const missile = missiles.pop()
                const tile = targets[i]
                const target = this.context.get(TerrainSystem).tilePosition(tile[0], tile[1], vec3())
                this.context.get(AnimationSystem).start(missile.launch(target, i), true)
            }
            

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
    public *close(): Generator<ActionSignal> {
        const mesh = this.cube.meshes[this.cube.state.side]
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
    private findTarget(direction: Direction): vec2[] {
        const out = []
        const origin = this.cube.state.tile
        const terrain = this.context.get(TerrainSystem)
        const forward = (direction - 1) * 0.5 * Math.PI
        const tile = vec2(), limit = 4
        for(let x = -limit; x <= limit; x++)
        for(let y = -limit; y <= limit; y++){
            vec2.set(x, y, tile)
            const angle = shortestAngle(forward, vec2.rotation(tile))
            const distance = vec2.magnitudeSquared(tile)
            const heuristic = distance + angle * angle
            vec2.add(origin, tile, tile)

            const entity = terrain.getTile(tile[0], tile[1])
            //if(entity != null)
        }
        while(out.length < 4) out.push(vec2(
            origin[0] + randomInt(-limit, limit, random),
            origin[1] + randomInt(-limit, limit, random)
        ))
        return out
    }
}