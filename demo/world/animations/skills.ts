import { vec2, vec3, vec4, ease, lerp } from '../../engine/math'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { Application } from '../../engine/framework'
import { ActionSignal } from '../Actor'
import { TransformSystem } from '../../engine/Transform'
import { SpriteMaterial } from '../../engine/Sprite'
import { PlayerSystem } from '../player'
import { SpriteAnimation, PropertyAnimation } from './timeline'
import { BillboardType, Line, Sprite } from '../../engine/batch'

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
    }),
    flash: SpriteAnimation({
        scale: PropertyAnimation([
            { frame: 0, value: [0,0,0] },
            { frame: 1, value: [4,4,4], ease: ease.cubicOut }
        ], vec3.lerp, 1),
        color: PropertyAnimation([
            { frame: 0, value: [1,1,1,1] },
            { frame: 1, value: [0,0,0,0], ease: ease.quadIn }
        ], vec4.lerp, 1)
    })
}

export function* activateBeamSkill(context: Application, origin: vec3, target: vec3): Generator<ActionSignal> {
    const particleEffects = context.get(ParticleEffectPass)

    const ringMaterial = new SpriteMaterial()
    ringMaterial.texture = context.get(PlayerSystem).effects.textures.ring
    vec2.set(2, 2, ringMaterial.size)

    const raysMaterial = new SpriteMaterial()
    raysMaterial.texture = context.get(PlayerSystem).effects.textures.rays
    vec2.set(2, 2, raysMaterial.size)

    const ring = particleEffects.addSprite()
    ring.billboard = BillboardType.Sphere
    ring.transform = context.get(TransformSystem).create()
    vec3.copy(origin, ring.transform.position)
    ring.material = ringMaterial

    const flash = particleEffects.addSprite()
    flash.billboard = BillboardType.Sphere
    flash.transform = context.get(TransformSystem).create()
    vec3.copy(origin, flash.transform.position)
    flash.material = raysMaterial

    const beam = new Line()
    particleEffects.list.push(beam)
    beam.path = [vec3.copy(origin, vec3()), vec3.copy(target, vec3())]
    beam.material = context.get(PlayerSystem).effects.beamMaterial
    beam.material.tint[0] = Math.sqrt(vec3.distanceSquared(origin, target)) / beam.width

    const sparks = context.get(PlayerSystem).effects.sparks.add({
        uOrigin: [0,0,0,0],
        uLifespan: [1,1,-1,0],
        uSize: [0.4,0.8],
        uRadius: [0.2,0.5],
        uForce: [8,10],
        uTarget: [0,0,0],
        uGravity: [0,-9.8,0],
        uTrailLength: [0.2]
    })
    vec3.copy(origin, sparks.uniform.uniforms.uOrigin as any)
    vec3.copy(origin, sparks.uniform.uniforms.uTarget as any)

    sparks.count += 20

    for(const duration = 1, startTime = context.currentTime; true;){
        const elapsedTime = context.currentTime - startTime
        const fraction = Math.min(1, elapsedTime / duration)

        animations.ring(fraction, ring)
        animations.flash(fraction, flash)

        vec3.lerp(origin, target, Math.min(1, 2 * fraction), beam.path[1])
        beam.width = lerp(0, 2, Math.min(1, 4 * fraction))
        beam.material.tint[0] = Math.sqrt(vec3.distanceSquared(origin, target)) / beam.width

        if(fraction >= 1) break
        yield ActionSignal.WaitNextFrame
    }

    context.get(TransformSystem).delete(ring.transform)
    particleEffects.remove(ring)

    context.get(TransformSystem).delete(flash.transform)
    particleEffects.remove(flash)

    particleEffects.remove(beam)

    context.get(PlayerSystem).effects.sparks.remove(sparks)
    return
}