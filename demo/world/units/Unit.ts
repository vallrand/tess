import { Application } from '../../engine/framework'
import { vec2, vec3, vec4, quat, lerp, ease, quadraticBezier3D, quadraticBezierNormal3D } from '../../engine/math'
import { DecalMaterial, SpriteMaterial } from '../../engine/materials'
import { Mesh, Sprite, BillboardType } from '../../engine/components'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../engine/pipeline'
import { AnimationSystem, ActionSignal, Transform, TransformSystem } from '../../engine/scene'
import { AnimationTimeline, PropertyAnimation, EventTrigger } from '../../engine/scene/Animation'
import { ParticleEmitter } from '../../engine/particles'
import { SharedSystem } from '../shared'
import { IUnit, TerrainSystem } from '../terrain'

interface MovementStrategy {
    evaluate(): Generator<{
        column: number
        row: number
        cost: number
    }>
}

export abstract class ControlUnit implements IUnit {
    public readonly tile: vec2 = vec2()
    public readonly size: vec2 = vec2.ONE
    actionIndex: number
    turn: number

    movementStrategy: any
    actionStrategy: any

    constructor(protected readonly context: Application){}
    public abstract place(column: number, row: number): void 
    public abstract kill(): void

    //public abstract appear(): Generator<ActionSignal>
    public abstract disappear(): Generator<ActionSignal>
    //public abstract damage(): Generator<ActionSignal>
    public abstract move(path: vec2[]): Generator<ActionSignal>
    public abstract strike(target: vec2): Generator<ActionSignal>

    protected *dissolveRigidMesh(mesh: Mesh): Generator<ActionSignal> {
        mesh.material.program = SharedSystem.materials.dissolveProgram

        const burn = this.context.get(DecalPass).create(4)
        burn.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, mesh.transform)
        burn.material = new DecalMaterial()
        burn.material.program = this.context.get(DecalPass).program
        burn.material.diffuse = SharedSystem.textures.glow

        const wave = new Sprite()
        wave.billboard = BillboardType.None
        wave.material = new SpriteMaterial()
        wave.material.blendMode = null
        wave.material.program = SharedSystem.materials.chromaticAberration
        wave.material.diffuse = SharedSystem.textures.wave
        wave.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], mesh.transform.position, vec3()), Sprite.FlatUp, vec3.ONE)
        this.context.get(PostEffectPass).add(wave)

        const ring = new Sprite()
        ring.billboard = BillboardType.None
        ring.material = new SpriteMaterial()
        ring.material.program = this.context.get(ParticleEffectPass).program
        ring.material.diffuse = SharedSystem.textures.raysInner
        ring.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], mesh.transform.position, vec3()), Sprite.FlatUp, vec3.ONE)
        this.context.get(ParticleEffectPass).add(ring)

        const light = this.context.get(PointLightPass).create()
        light.transform = this.context.get(TransformSystem)
        .create([0,1.5,0], quat.IDENTITY, vec3.ONE, mesh.transform)

        const pillar = new Sprite()
        pillar.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,pillar.origin)
        pillar.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, mesh.transform)
        pillar.material = new SpriteMaterial()
        pillar.material.program = this.context.get(ParticleEffectPass).program
        pillar.material.diffuse = SharedSystem.textures.groundDust
        this.context.get(ParticleEffectPass).add(pillar)

        const spikes = SharedSystem.particles.spikes.add({
            uLifespan: [0.4,0.8,-0.1,0],
            uOrigin: mesh.transform.position,
            uGravity: vec3.ZERO,
            uSize: [this.size[0]*1,this.size[0]*4],
            uRotation: vec2.ZERO,
            uForce: [2,6],
            uTarget: vec3.subtract(mesh.transform.position, [0,0.2,0], vec3()),
            uRadius: [0.2,0.2],
            uFrame: [0,2]
        })

        const animate = AnimationTimeline({ mesh, burn, wave, light, pillar, ring, spikes }, {
            'spikes': EventTrigger([
                { frame: 0, value: this.size[0] * 8 }
            ], (emitter: ParticleEmitter, amount: number) => emitter.count += amount),
            'pillar.transform.scale': PropertyAnimation([
                { frame: 0.1, value: [0,3,0] },
                { frame: 0.3, value: [2,6,2], ease: ease.cubicOut },
                { frame: 0.8, value: [4,1,4], ease: ease.sineIn }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 0.1, value: [0.1,0.02,0.05,1] },
                { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'light.color': PropertyAnimation([
                { frame: 0, value: [1,0.2,0.4] }
            ], vec3.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0.0, value: 0 },
                { frame: 0.6, value: this.size[0] * 4, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.0, value: 8 },
                { frame: 0.6, value: 0, ease: ease.sineIn }
            ], lerp),

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.1, value: vec3.ZERO },
                { frame: 0.7, value: [this.size[0] * 8, this.size[1] * 8, 1], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.1, value: [0.6,0.4,0.5,0.8] },
                { frame: 0.7, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'wave.transform.scale': PropertyAnimation([
                { frame: 0.1, value: vec3.ZERO },
                { frame: 0.5, value: [this.size[0] * 8, this.size[1] * 8, 1], ease: ease.quartOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.1, value: [1,1,1,1] },
                { frame: 0.5, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'mesh.color': PropertyAnimation([
                { frame: 0, value: [1,1,1,-2*mesh.buffer.radius] },
                { frame: 0.1, value: [0.8,1,0, -2*mesh.buffer.radius], ease: ease.sineIn },
                { frame: 0.4, value: [0.2,0.5,0,-mesh.buffer.radius], ease: ease.quadOut },
                { frame: 3, value: [0.2,0.5,0,1], ease: ease.slowInOut }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.copy(mesh.transform.position, vec3()) },
                { frame: 0.4, value: vec3.add(mesh.transform.position, [0,-0.5,0], vec3()), ease: ease.bounceIn(0.1,0.6) }
            ], vec3.lerp),
            'burn.transform.scale': PropertyAnimation([
                { frame: 0, value: [0,0,0] },
                { frame: 0.4, value: [this.size[0] * 8, 4, this.size[1] * 8], ease: ease.cubicOut }
            ], vec3.lerp),
            'burn.color': PropertyAnimation([
                { frame: 0.4, value: [0.2,0.2,0.2,1] },
                { frame: 3, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp)
        })

        // const debris = this.context.get(SharedSystem).debris.create(mesh.transform.position)
        // vec4.set(0,0,0,1, debris.color)

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.spikes.remove(spikes)

        this.context.get(TransformSystem).delete(burn.transform)
        this.context.get(TransformSystem).delete(wave.transform)
        this.context.get(TransformSystem).delete(pillar.transform)
        this.context.get(TransformSystem).delete(light.transform)
        this.context.get(TransformSystem).delete(ring.transform)

        this.context.get(PointLightPass).delete(light)
        this.context.get(PostEffectPass).remove(wave)
        this.context.get(DecalPass).delete(burn)
        this.context.get(ParticleEffectPass).remove(pillar)
        this.context.get(ParticleEffectPass).remove(ring)

        // this.kill()
    }

    protected snapPosition(tile: vec2, out: vec3){
        const column = tile[0] + 0.5 * (this.size[0] - 1)
        const row = tile[1] + 0.5 * (this.size[1] - 1)
        this.context.get(TerrainSystem).tilePosition(column, row, out)
    }
    protected *moveAlongPath(
        path: vec2[], transform: Transform, floatDuration: number, rotate: boolean
    ): Generator<ActionSignal> {
        const direction = vec3(), previousRotation = quat.copy(transform.rotation, quat())
        const entry = vec3(), exit = vec3(), center = vec3()

        for(let last = path.length - 1, i = 0; i <= last; i++){
            const tile = path[i]
            this.snapPosition(tile, center)
            vec2.copy(tile, this.tile)

            if(i == 0) vec3.copy(center, entry)
            else this.snapPosition(path[i - 1], entry)
            if(i == last) vec3.copy(center, exit)
            else this.snapPosition(path[i + 1], exit)

            vec3.centroid(entry, center, entry)
            vec3.centroid(exit, center, exit)
            if(i == 0 || i == last) vec3.centroid(entry, exit, center)

            const mode = i == 0 ? 0 : i == last ? 2 : 1
            const movementEase = mode == 0 ? ease.quadIn : mode == 2 ? ease.quadOut : ease.linear

            for(const duration = mode != 1 ? 2*floatDuration : floatDuration, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                const fraction = Math.min(1, elapsedTime / duration)
                quadraticBezier3D(entry, center, exit, movementEase(fraction), transform.position)

                if(rotate) if(mode == 0){
                    vec3.subtract(exit, entry, direction)
                    quat.fromNormal(vec3.normalize(direction, direction), vec3.AXIS_Y, transform.rotation)
                    quat.slerp(previousRotation, transform.rotation, ease.quadOut(fraction), transform.rotation)
                }else{
                    quadraticBezierNormal3D(entry, center, exit, movementEase(fraction), direction)
                    quat.fromNormal(vec3.normalize(direction, direction), vec3.AXIS_Y, transform.rotation)
                    quat.normalize(transform.rotation, transform.rotation)
                }

                transform.frame = 0

                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }
    }
}