import { lerp, quat, vec2, vec3, vec4 } from '../../engine/math'
import { TransformSystem } from '../../engine/scene'
import { AnimationTimeline, PropertyAnimation, EventTrigger, ActionSignal, ease } from '../../engine/animation'
import { Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { PointLight, PointLightPass, ParticleEffectPass, PostEffectPass, Decal, DecalPass } from '../../engine/pipeline'
import { ParticleEmitter } from '../../engine/particles'

import { DamageType } from '../military'
import { SharedSystem, ModelAnimation } from '../shared'
import { CubeSkill } from './CubeSkill'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [16,2,16] },
        { frame: 0.6, value: [0,2,0], ease: ease.quadIn }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.6, value: [0.8,0.3,0.6,0.4], ease: ease.quadOut }
    ], vec4.lerp),
    'crack.transform.scale': PropertyAnimation([
        { frame: 0, value: [16,2,16] }
    ], vec3.lerp),
    'crack.threshold': PropertyAnimation([
        { frame: 0.7, value: 2.5 },
        { frame: 1.2, value: 0, ease: ease.cubicOut },
        { frame: 2, value: -2.5, ease: ease.sineOut }
    ], lerp),
    'crack.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.6, value: [0,0,0,1], ease: ease.sineOut }
    ], vec4.lerp),
    'bolts.rate': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.8, value: 0.004, ease: ease.stepped },
        { frame: 1.8, value: 0, ease: ease.stepped }
    ], lerp),
    'bolts.uniform.uniforms.uRadius': PropertyAnimation([
        { frame: 0.8, value: vec2.ONE },
        { frame: 1.8, value: [6,7], ease: ease.sineOut }
    ], vec2.lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0.7, value: vec3.ZERO },
        { frame: 1.2, value: [20,20,20], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0.8, value: vec4.ONE },
        { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.2, value: 12, ease: ease.cubicOut },
        { frame: 2, value: 0, ease: ease.cubicIn }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.6, value: 0 },
        { frame: 0.8, value: 4, ease: ease.cubicIn },
        { frame: 1.4, value: 0.5, ease: ease.cubicOut },
        { frame: 2, value: 0, ease: ease.sineIn }
    ], lerp),
    'light.color': PropertyAnimation([
        { frame: 0.8, value: [0.5,0.8,1] },
        { frame: 1.4, value: [1,0.2,0.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0.6, value: vec3.ZERO },
        { frame: 1.0, value: [6,6,6], ease: ease.quartOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.6, value: [0.6,0.8,1.0,0] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [0,2,1] },
        { frame: 1.2, value: [1.4,4.8,1], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.6, value: [1,0.6,0.8,0] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cylinder.transform.scale': PropertyAnimation([
        { frame: 0, value: [8,2,8] },
        { frame: 0.5, value: [3,8,3], ease: ease.sineOut },
        { frame: 0.8, value: [6,1,6], ease: ease.cubicIn }
    ], vec3.lerp),
    'cylinder.transform.rotation': PropertyAnimation([
        { frame: 0, value: quat.IDENTITY },
        { frame: 0.5, value: quat.axisAngle(vec3.AXIS_Y, -1.0*Math.PI, quat()), ease: ease.quadIn },
        { frame: 0.8, value: quat.axisAngle(vec3.AXIS_Y, -1.5*Math.PI, quat()), ease: ease.quadOut }
    ], quat.slerp),
    'cylinder.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.5, value: vec4.ONE, ease: ease.quadOut },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quartIn }
    ], vec4.lerp)
}

export class ShockwaveSkill extends CubeSkill {
    readonly damageType: DamageType = DamageType.Electric | DamageType.Immobilize
    damage: number = 1
    range: number = Math.sqrt(5)

    private ring: Decal
    private crack: Decal
    private light: PointLight
    private wave: Sprite
    private flash: Sprite
    private beam: Sprite
    private cylinder: BatchMesh
    private bolts: ParticleEmitter

    public query(): vec2[] { return CubeSkill.queryArea(this.context, this.cube.tile, this.minRange, this.range, 2) }
    public *activate(targets: vec2[]): Generator<ActionSignal> {
        this.cube.action.amount = 0
        
        this.ring = this.context.get(DecalPass).create(0)
        this.ring.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.ring.material = SharedSystem.materials.decal.halo

        this.crack = this.context.get(DecalPass).create(1)
        this.crack.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.crack.material = SharedSystem.materials.shatterMaterial

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.displacement.wave
        this.wave.transform = this.context.get(TransformSystem).create([0,1.5,0], quat.HALF_N_X, vec3.ONE, this.cube.transform)
        this.context.get(PostEffectPass).add(this.wave)

        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = SharedSystem.materials.sprite.wave
        this.flash.transform = this.context.get(TransformSystem).create([0,1.6,0], quat.HALF_N_X, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem).create([0,3,0], quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.cylinder = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.cylinder.material = SharedSystem.materials.sprite.spiral
        this.cylinder.transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create([0,4,0], quat.IDENTITY, vec3.ONE, this.cube.transform)

        this.bolts = this.bolts || SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,2,0], this.cube.transform.position, vec3()),
            uRadius: vec2.ZERO, uGravity: vec3.ZERO, uOrientation: quat.IDENTITY,
            uLifespan: [0.1,0.8,0,0], uRotation: [0,2*Math.PI], uSize: [0.1,1.2], uFrame: [8,4]
        })

        const damage = EventTrigger(targets.map(value => ({ frame: 0.6, value })), CubeSkill.damage)
        const animate = AnimationTimeline(this, actionTimeline)

        for(const duration = 2.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }


        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.crack.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)

        this.context.get(PointLightPass).delete(this.light)

        this.context.get(DecalPass).delete(this.ring)
        this.context.get(DecalPass).delete(this.crack)

        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        Sprite.delete(this.wave)
        Sprite.delete(this.flash)
        Sprite.delete(this.beam)
        BatchMesh.delete(this.cylinder)
    }
    clear(){
        if(this.bolts) this.bolts = void SharedSystem.particles.bolts.remove(this.bolts)
    }
}