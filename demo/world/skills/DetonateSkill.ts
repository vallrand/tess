import { lerp, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Decal, DecalPass, ParticleEffectPass, PointLight, PointLightPass } from '../../engine/pipeline'
import { BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { ParticleEmitter } from '../../engine/particles'
import { TransformSystem } from '../../engine/scene'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { SharedSystem, ModelAnimation } from '../shared'
import { CubeSkill } from './CubeSkill'
import { Minefield } from './Minefield'
import { DirectionAngle } from '../player'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'dust': EventTrigger([{ frame: 1.0, value: 48 }], EventTrigger.emit),
    'light.radius': PropertyAnimation([
        { frame: 1, value: 0 },
        { frame: 1.5, value: 8, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 1, value: 8 },
        { frame: 1.5, value: 0, ease: ease.quadOut }
    ], lerp),
    'stamp.transform.scale': PropertyAnimation([
        { frame: 1, value: [10,4,10] }
    ], vec3.lerp),
    'stamp.threshold': PropertyAnimation([
        { frame: 0.9, value: 2.5 },
        { frame: 1.3, value: 0, ease: ease.quadOut },
        { frame: 2, value: -2.5, ease: ease.sineIn }
    ], lerp),
    'tube.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,2,0] },
        { frame: 1.2, value: [2.6,7,2.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'tube.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quartIn }
    ], vec4.lerp),
    'chargeX.transform.scale': PropertyAnimation([
        { frame: 0, value: [12,2,2] }
    ], vec3.lerp),
    'chargeY.transform.scale': PropertyAnimation([
        { frame: 0, value: [12,2,2] }
    ], vec3.lerp),
    'chargeX.threshold': PropertyAnimation([
        { frame: 0, value: 3 },
        { frame: 0.7, value: 0, ease: ease.sineIn },
        { frame: 1.4, value: -3, ease: ease.sineOut }
    ], lerp),
    'chargeY.threshold': PropertyAnimation([
        { frame: 0, value: 3 },
        { frame: 0.7, value: 0, ease: ease.sineIn },
        { frame: 1.4, value: -3, ease: ease.sineOut }
    ], lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.9, value: [2,7,1], ease: ease.sineIn }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.9, value: [1,0.5,0.6,0] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
}

export class DetonateSkill extends CubeSkill {
    public readonly minefield: Minefield = new Minefield(this.context)
    damage: number = 2
    private dust: ParticleEmitter
    private light: PointLight
    private stamp: Decal
    private tube: BatchMesh
    private chargeX: Decal
    private chargeY: Decal
    private beam: Sprite
    public query(): vec2 | null { return this.cube.tile }
    private static placeMine(skill: DetonateSkill, target: vec2){
        const mine = skill.minefield.create(target[0], target[1])
        mine.damage = skill.damage
    }
    public *activate(target: vec2): Generator<ActionSignal> {
        this.cube.action.amount = 0
        
        this.tube = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.tube.material = SharedSystem.materials.effect.stripesRed
        this.tube.transform = this.context.get(TransformSystem).create([0,3,0],quat.IDENTITY,vec3.ONE,this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.tube)

        this.stamp = this.context.get(DecalPass).create(0)
        this.stamp.material = SharedSystem.materials.stampMaterial
        this.stamp.transform = this.context.get(TransformSystem).create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.cube.transform)

        this.chargeX = this.context.get(DecalPass).create(0)
        this.chargeX.material = SharedSystem.materials.glowSquaresLinearMaterial
        this.chargeX.transform = this.context.get(TransformSystem).create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.cube.transform)

        this.chargeY = this.context.get(DecalPass).create(0)
        this.chargeY.material = SharedSystem.materials.glowSquaresLinearMaterial
        this.chargeY.transform = this.context.get(TransformSystem).create(vec3.ZERO,DirectionAngle[0],vec3.ONE,this.cube.transform)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem).create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.light = this.context.get(PointLightPass).create([1,0,0.2])
        this.light.transform = this.context.get(TransformSystem).create([0,2,0],quat.IDENTITY,vec3.ONE,this.cube.transform)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: this.cube.transform.position, uTarget: vec3.ZERO, uOrientation: quat.IDENTITY,
            uLifespan: [0.5,1,0,0], uSize: [3,6],
            uRadius: [0.5,1], uForce: [6,12],
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2*Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0]
        })

        const place = EventTrigger([{ frame: 1, value: target }], DetonateSkill.placeMine)
        const animate = AnimationTimeline(this, actionTimeline)

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            place(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.chargeX.transform)
        this.context.get(TransformSystem).delete(this.chargeY.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.stamp.transform)
        this.context.get(TransformSystem).delete(this.tube.transform)
        this.context.get(DecalPass).delete(this.chargeX)
        this.context.get(DecalPass).delete(this.chargeY)
        this.context.get(DecalPass).delete(this.stamp)
        SharedSystem.particles.dust.remove(this.dust)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.tube)
        BatchMesh.delete(this.tube)
        Sprite.delete(this.beam)
    }
}