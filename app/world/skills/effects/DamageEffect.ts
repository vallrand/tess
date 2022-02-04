import { Application } from '../../../engine/framework'
import { randomFloat, vec2, vec3, vec4, quat } from '../../../engine/math'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../../engine/animation'
import { Sprite, BillboardType, Mesh } from '../../../engine/components'
import { ParticleEffectPass } from '../../../engine/pipeline'
import { ParticleEmitter } from '../../../engine/particles'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { Cube } from '../../player'
import { SharedSystem } from '../../shared'
import { DamageType } from '../../military'

const actionTimeline = {
    'debris.transform.scale': PropertyAnimation([
        { frame: 0, value: [1.4,1.4,1.4] }
    ], vec3.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.2, value: vec3.ZERO },
        { frame: 0.7, value: [6,6,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.2, value: [0.8,0.6,0.8,0.6] },
        { frame: 0.7, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'spikes': EventTrigger([{ frame: 0.2, value: 8 }], EventTrigger.emit)
}

export class DamageEffect {
    private static readonly pool: DamageEffect[] = []
    public static create(context: Application, source: Cube, type: DamageType): DamageEffect {
        const effect = this.pool.pop() || new DamageEffect(context)
        context.get(AnimationSystem).start(effect.play(source, type), true)
        return effect
    }
    ring: Sprite
    spikes: ParticleEmitter
    debris: Mesh
    constructor(private readonly context: Application){}
    public *play(cube: Cube, type: DamageType): Generator<ActionSignal> {
        this.debris = this.context.get(SharedSystem).debris.create(cube.transform.position)
        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.burst
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y,quat.HALF_X,vec3.ONE,cube.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.spikes = SharedSystem.particles.spikes.add({
            uLifespan: [0.6,1.0,0,0],
            uOrigin: vec3.add([0,0.5,0], cube.transform.position, vec3()),
            uTarget: [0,-0.5,0],
            uGravity: vec3.ZERO, uRotation: vec2.ZERO,
            uFrame: [0,2], uSize: [2,4],
            uRadius: [0.2,0.4], uForce: [1,4]
        })

        this.context.get(AudioSystem)
        .create(`assets/cube_damage.mp3`, 'sfx', cube.transform)
        .play(0, randomFloat(0.84, 1.16, SharedSystem.random()))
        const animate = AnimationTimeline(this, actionTimeline)
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        SharedSystem.particles.spikes.remove(this.spikes)
        this.context.get(SharedSystem).debris.delete(this.debris)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(ParticleEffectPass).remove(this.ring)
        Sprite.delete(this.ring)
        DamageEffect.pool.push(this)
    }
}