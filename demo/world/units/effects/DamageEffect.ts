import { Application } from '../../../engine/framework'
import { vec2, vec3, vec4, quat } from '../../../engine/math'
import { SpriteMaterial } from '../../../engine/materials'
import { Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { ParticleEffectPass } from '../../../engine/pipeline'
import { TransformSystem } from '../../../engine/scene'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEmitter } from '../../../engine/particles'
import { SharedSystem } from '../../shared'
import { AIUnit, DamageType } from '../../military'

const timeline = {
    [DamageType.Kinetic]: {
        'embers': EventTrigger([{ frame: 0, value: 24 }], EventTrigger.emit),
        'ring.transform.scale': PropertyAnimation([
            { frame: 0, value: vec3.ZERO },
            { frame: 0.3, value: [8,8,8], ease: ease.cubicOut }
        ], vec3.lerp),
        'ring.color': PropertyAnimation([
            { frame: 0, value: [1,0.8,0.5,0.4] },
            { frame: 0.3, value: vec4.ZERO, ease: ease.sineIn }
        ], vec4.lerp)
    },
    [DamageType.Electric]: {
        'sparks': EventTrigger([{ frame: 0, value: 24 }], EventTrigger.emit),
        'sphere.transform.scale': PropertyAnimation([
            { frame: 0, value: vec3.ZERO },
            { frame: 0.4, value: [3,3,3], ease: ease.cubicOut }
        ], vec3.lerp),
        'sphere.color': PropertyAnimation([
            { frame: 0, value: [0.5,1,1,0.8] },
            { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
        ], vec4.lerp)
    },
    [DamageType.Corrosion]: {
        'fire': EventTrigger([{ frame: 0, value: 24 }], EventTrigger.emit),
    },
    [DamageType.Temperature]: {
        'flash.transform.scale': PropertyAnimation([
            { frame: 0, value: vec3.ZERO },
            { frame: 0.6, value: [6,6,6], ease: ease.quartOut }
        ], vec3.lerp),
        'flash.color': PropertyAnimation([
            { frame: 0, value: vec4.ONE },
            { frame: 0.6, value: vec4.ZERO, ease: ease.sineIn }
        ], vec4.lerp),
        'wave.transform.scale': PropertyAnimation([
            { frame: 0, value: vec3.ZERO },
            { frame: 0.4, value: [6,6,6], ease: ease.quartOut }
        ], vec3.lerp),
        'wave.color': PropertyAnimation([
            { frame: 0, value: [0.6,0.8,1,0.4] },
            { frame: 0.4, value: vec4.ZERO, ease: ease.quadIn }
        ], vec4.lerp)
    }
}

export class DamageEffect {
    private static readonly pool: DamageEffect[] = []
    public static create(context: Application, source: AIUnit, type: DamageType): DamageEffect {
        const effect = this.pool.pop() || new DamageEffect(context)
        context.get(AnimationSystem).start(effect.damage(source, type), true)
        return effect
    }
    private readonly origin: vec3 = vec3()
    private embers: ParticleEmitter
    private sparks: ParticleEmitter
    private fire: ParticleEmitter
    private ring: Sprite
    private sphere: BatchMesh
    private flash: Sprite
    private wave: Sprite
    constructor(private readonly context: Application){}
    public *damage(source: AIUnit, type: DamageType): Generator<ActionSignal> {
        const origin = vec3.add(vec3.AXIS_Y, source.mesh.transform.position, this.origin)
        const animations = {}

        if(type & DamageType.Kinetic){
            this.embers = SharedSystem.particles.embers.add({
                uLifespan: [0.4,0.6,0,0], uOrigin: origin,
                uRotation: vec2.ZERO, uOrientation: quat.IDENTITY,
                uGravity: [0,-10,0],
                uSize: [0.2,0.8],
                uRadius: [0,1],
                uForce: [8,16],
                uTarget: [0,-0.2,0]
            })

            this.ring = Sprite.create(BillboardType.None)
            this.ring.material = SharedSystem.materials.sprite.burst
            this.ring.transform = this.context.get(TransformSystem).create(origin, Sprite.FlatUp, vec3.ONE)
            this.context.get(ParticleEffectPass).add(this.ring)

            Object.assign(animations, timeline[DamageType.Kinetic])
        }
        if(type & DamageType.Electric){
            this.sparks = SharedSystem.particles.sparks.add({
                uLifespan: [0.4,0.6,0,0], uOrigin: origin, uTarget: vec3.ZERO,
                uForce: [6,12], uGravity: [0,-10,0], uRadius: [0,0.4],
                uSize: [0.2,0.8], uLength: [0.2,0.4]
            })
            this.sphere = BatchMesh.create(SharedSystem.geometry.lowpolySphere, 0)
            this.sphere.material = SharedSystem.materials.energyPurpleMaterial
            this.sphere.transform = this.context.get(TransformSystem).create(origin, quat.IDENTITY, vec3.ONE)
            this.context.get(ParticleEffectPass).add(this.sphere)

            Object.assign(animations, timeline[DamageType.Electric])
        }
        if(type & DamageType.Corrosion){
            this.fire = SharedSystem.particles.fire.add({
                uLifespan: [0.4,0.6,0,0], uOrigin: origin,
                uRadius: [0,1], uSize: [0.5,2], uGravity: [0,6,0], uRotation: vec2.ZERO
            })
            
            Object.assign(animations, timeline[DamageType.Corrosion])
        }
        if(type & DamageType.Temperature){
            this.flash = Sprite.create(BillboardType.Sphere)
            this.flash.material = new SpriteMaterial()
            this.flash.material.program = SharedSystem.materials.beamRadialProgram
            vec2.set(8, 10, this.flash.material.uvTransform as any)
            this.flash.material.diffuse = SharedSystem.gradients.yellowViolet
            this.flash.transform = this.context.get(TransformSystem).create(origin, quat.IDENTITY, vec3.ONE)
            this.context.get(ParticleEffectPass).add(this.flash)
    
            this.wave = Sprite.create(BillboardType.Sphere)
            this.wave.material = new SpriteMaterial()
            this.wave.material.program = this.context.get(ParticleEffectPass).program
            this.wave.material.diffuse = SharedSystem.textures.ring
            this.wave.transform = this.context.get(TransformSystem).create(origin, Sprite.FlatUp, vec3.ONE)
            this.context.get(ParticleEffectPass).add(this.wave)

            Object.assign(animations, timeline[DamageType.Temperature])
        }
        const animate = AnimationTimeline(this, animations)

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        if(type & DamageType.Kinetic){
            this.context.get(TransformSystem).delete(this.ring.transform)
            this.context.get(ParticleEffectPass).remove(this.ring)
            Sprite.delete(this.ring)
            SharedSystem.particles.embers.remove(this.embers)
        }
        if(type & DamageType.Electric){
            this.context.get(TransformSystem).delete(this.sphere.transform)
            this.context.get(ParticleEffectPass).remove(this.sphere)
            BatchMesh.delete(this.sphere)
            SharedSystem.particles.sparks.remove(this.sparks)
        }
        if(type & DamageType.Corrosion){
            SharedSystem.particles.fire.remove(this.fire)
        }
        if(type & DamageType.Temperature){
            this.context.get(TransformSystem).delete(this.flash.transform)
            this.context.get(TransformSystem).delete(this.wave.transform)
            this.context.get(ParticleEffectPass).remove(this.flash)
            this.context.get(ParticleEffectPass).remove(this.wave)
            Sprite.delete(this.flash)
            Sprite.delete(this.wave)
        }
        DamageEffect.pool.push(this)
    }
}