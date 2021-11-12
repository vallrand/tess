import { Application } from '../../../engine/framework'
import { vec2, vec3, vec4, quat, lerp } from '../../../engine/math'
import { MeshMaterial } from '../../../engine/materials'
import { Mesh, Sprite, BillboardType } from '../../../engine/components'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { TransformSystem } from '../../../engine/scene'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEmitter } from '../../../engine/particles'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit } from '../../military'

export class DeathEffect {
    private static readonly pool: DeathEffect[] = []
    public static create(context: Application, source: AIUnit): DeathEffect {
        const effect = this.pool.pop() || new DeathEffect(context)
        context.get(AISystem).remove(source)
        context.get(AnimationSystem).start(effect.use(source), true)
        return effect
    }
    private readonly material: MeshMaterial = new MeshMaterial()
    constructor(private readonly context: Application){}

    private burn: Decal
    private wave: Sprite
    private light: PointLight
    private pillar: Sprite
    private ring: Sprite
    private spikes: ParticleEmitter
    private debris: Mesh
    private mesh: Mesh
    public *use(source: AIUnit): Generator<ActionSignal> {
        for(const generator = source.deactivate(); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }

        this.mesh = source.mesh
        MeshMaterial.copy(this.mesh.material as MeshMaterial, this.material)
        this.material.program = SharedSystem.materials.program.dissolve
        this.mesh.material = this.material

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.burn.material = SharedSystem.materials.decal.glow

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.distortion.wave
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], this.mesh.transform.position, vec3()), Sprite.FlatUp, vec3.ONE)
        this.context.get(PostEffectPass).add(this.wave)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.burst
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], this.mesh.transform.position, vec3()), Sprite.FlatUp, vec3.ONE)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,1.5,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)

        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.pillar.material = SharedSystem.materials.sprite.dust
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.spikes = SharedSystem.particles.spikes.add({
            uLifespan: [0.4,0.8,-0.1,0],
            uOrigin: this.mesh.transform.position,
            uGravity: vec3.ZERO,
            uSize: [source.size[0]*1,source.size[0]*4],
            uRotation: vec2.ZERO,
            uForce: [2,6],
            uTarget: [0,-0.2,0],
            uRadius: [0.2,0.2],
            uFrame: [0,2]
        })

        const animate = AnimationTimeline(this, {
            'spikes': EventTrigger([
                { frame: 0, value: source.size[0] * 8 }
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
                { frame: 0.6, value: source.size[0] * 4, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.0, value: 8 },
                { frame: 0.6, value: 0, ease: ease.sineIn }
            ], lerp),

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.1, value: vec3.ZERO },
                { frame: 0.7, value: [source.size[0] * 8, source.size[1] * 8, 1], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.1, value: [0.6,0.4,0.5,0.8] },
                { frame: 0.7, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'wave.transform.scale': PropertyAnimation([
                { frame: 0.1, value: vec3.ZERO },
                { frame: 0.5, value: [source.size[0] * 8, source.size[1] * 8, 1], ease: ease.quartOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.1, value: vec4.ONE },
                { frame: 0.5, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'mesh.color': PropertyAnimation([
                { frame: 0, value: [1,1,1,-2*source.mesh.buffer.radius] },
                { frame: 0.1, value: [0.8,1,0, -2*source.mesh.buffer.radius], ease: ease.sineIn },
                { frame: 0.4, value: [0.2,0.5,0,-source.mesh.buffer.radius], ease: ease.quadOut },
                { frame: 3, value: [0.2,0.5,0,1], ease: ease.slowInOut }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.copy(source.mesh.transform.position, vec3()) },
                { frame: 0.4, value: vec3.add(source.mesh.transform.position, [0,-0.5,0], vec3()), ease: ease.bounceIn(0.1,0.6) }
            ], vec3.lerp),
            'burn.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.4, value: [source.size[0] * 8, 4, source.size[1] * 8], ease: ease.cubicOut }
            ], vec3.lerp),
            'burn.color': PropertyAnimation([
                { frame: 0.4, value: [0.2,0.2,0.2,1] },
                { frame: 3, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp)
        })

        this.debris = this.context.get(SharedSystem).debris.create(this.mesh.transform.position)
        const scale = 0.4 + 0.4 * source.size[0]
        vec3.set(scale, scale, scale, this.debris.transform.scale)
        vec4.set(0,0,0,1, this.debris.color)

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.spikes.remove(this.spikes)

        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.ring)

        Sprite.delete(this.wave)
        Sprite.delete(this.pillar)
        Sprite.delete(this.ring)

        this.debris = void this.context.get(SharedSystem).debris.delete(this.debris)

        source.delete()
        DeathEffect.pool.push(this)
    }
}