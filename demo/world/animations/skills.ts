import { vec2, vec3, vec4, ease } from '../../engine/math'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { Application } from '../../engine/framework'
import { ActionSignal } from '../Actor'
import { TransformSystem } from '../../engine/Transform'
import { SpriteMaterial } from '../../engine/Sprite'
import { PlayerSystem } from '../player'
import { SpriteAnimation, PropertyAnimation } from './timeline'
import { BillboardType } from '../../engine/batch'

const animations = {
    ring: SpriteAnimation({
        scale: PropertyAnimation([
            { frame: 0, value: [5,5,5] },
            { frame: 1, value: [0,0,0], ease: ease.cubicIn }
        ], vec3.lerp, 1),
        color: PropertyAnimation([
            { frame: 0, value: [0,0,0,0] },
            { frame: 1, value: [0.5,1,1,1], ease: ease.quadOut }
        ], vec4.lerp, 1)
    })
}

export function* activateBeamSkill(context: Application): Generator<ActionSignal> {
    const particleEffects = context.get(ParticleEffectPass)
    const origin: vec3 = vec3(0,0,0)
    const target: vec3 = vec3(4,0,0)

    const ringMaterial = new SpriteMaterial()
    ringMaterial.texture = context.get(PlayerSystem).effects.textures.ring
    vec2.set(2, 2, ringMaterial.size)

    const ring = particleEffects.addSprite()
    ring.billboard = BillboardType.Sphere
    ring.transform = context.get(TransformSystem).create()
    vec3.copy(origin, ring.transform.position)
    ring.material = ringMaterial

    for(const duration = 1, startTime = context.currentTime; true;){
        const elapsedTime = context.currentTime - startTime
        const fraction = Math.min(1, elapsedTime / duration)

        animations.ring(fraction, ring)

        if(fraction >= 1) break
        yield ActionSignal.WaitNextFrame
    }

    context.get(TransformSystem).delete(ring.transform)
    particleEffects.remove(ring)
    return
}