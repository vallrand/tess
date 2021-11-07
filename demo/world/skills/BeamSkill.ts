import { mod, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { PointLight, PointLightPass, ParticleEffectPass } from '../../engine/pipeline'
import { SpriteMaterial } from '../../engine/materials'
import { TransformSystem } from '../../engine/scene'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, BatchMesh, Line } from '../../engine/components'
import { SharedSystem, ModelAnimation } from '../shared'
import { Cube, Direction, DirectionAngle} from '../player'
import { CubeSkill } from './CubeSkill'
import { DamageType, Unit } from '../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'light.radius': PropertyAnimation([
        { frame: 1.0, value: 0 },
        { frame: 1.4, value: 8, ease: ease.quadOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 1.0, value: 0 },
        { frame: 1.4, value: 4, ease: ease.quadOut },
        { frame: 3, value: 0, ease: ease.quadIn }
    ], lerp),
    'center.transform.scale': PropertyAnimation([
        { frame: 1.2, value: vec3.ZERO },
        { frame: 1.8, value: [8,8,8], ease: ease.cubicOut }
    ], vec3.lerp),
    'center.color': PropertyAnimation([
        { frame: 2.4, value: vec4.ONE },
        { frame: 3, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0, value: [6,0,6] },
        { frame: 1.0, value: [3,3,3], ease: ease.quadOut },
        { frame: 1.5, value: [0,6,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: [0,0,0,0] },
        { frame: 1.2, value: [1,1,1,1], ease: ease.quadOut },
        { frame: 1.4, value: [1,1,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'cone.material.uniform.uniforms.uUVTransform.1': PropertyAnimation([
        { frame: 0.4, value: 0 },
        { frame: 1.5, value: -0xFF*0.0072, ease: ease.quartIn },
        { frame: 2.0, value: 0, ease: ease.stepped }
    ], lerp),
    'cone.material.uniform.uniforms.uUV2Transform.1': PropertyAnimation([
        { frame: 0.4, value: 0 },
        { frame: 1.5, value: -0xFF*0.0144, ease: ease.quartIn },
        { frame: 2.0, value: 0, ease: ease.stepped }
    ], lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [4,4,4] },
        { frame: 1.1, value: [8,8,8], ease: ease.sineOut },
        { frame: 1.4, value: [0,0,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0,0,0,0] },
        { frame: 1.1, value: [0.1,0.5,0.6,0.5], ease: ease.quadOut },
        { frame: 1.4, value: [0.5,1,1,0], ease: ease.sineIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 1.3, value: [0,0,0] },
        { frame: 1.8, value: [10,10,10], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 1.3, value: [0.7,1,1,0] },
        { frame: 1.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'beam.width': PropertyAnimation([
        { frame: 1.3, value: 0 },
        { frame: 1.6, value: 2, ease: ease.sineIn }
    ], lerp),
    'beam.color': PropertyAnimation([
        { frame: 2.4, value: vec4.ONE },
        { frame: 3.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'energy': EventTrigger([{ frame: 0, value: 128 }], EventTrigger.emit),
    'sparks': EventTrigger([{ frame: 1.2, value: 32 }], EventTrigger.emit),
    'smoke': EventTrigger([{ frame: 2.5, value: 8 }], EventTrigger.emit)
}

export class BeamSkill extends CubeSkill {
    readonly damageType: DamageType = DamageType.Temperature
    damage: number = 1
    range: number = 8

    private cone: BatchMesh
    private beam: Line
    private energy: ParticleEmitter
    private sparks: ParticleEmitter
    private smoke: ParticleEmitter
    private light: PointLight
    private center: Sprite
    private flash: Sprite
    private ring: Sprite
    private readonly origin: vec3 = vec3()
    private readonly target: vec3 = vec3()
    constructor(context: Application, cube: Cube){
        super(context, cube)
        this.center = Sprite.create(BillboardType.Sphere)
        this.center.material = new SpriteMaterial(vec4(8,4,1,1))
        this.center.material.program = SharedSystem.materials.beamRadialProgram
        this.center.material.diffuse = SharedSystem.gradients.tealBlue

        this.beam = Line.create(2, 0)
        this.beam.material = new SpriteMaterial(vec4(4,8,1,1))
        this.beam.material.program = SharedSystem.materials.beamLinearProgram
        this.beam.material.diffuse = SharedSystem.gradients.tealBlue
    }
    public query(direction: Direction): vec2[] { return CubeSkill.queryLine(this.context, this.cube.tile, mod(this.direction+2,4), this.range, 2) }
    public *activate(targets: vec2[]): Generator<ActionSignal> {
        this.cube.action.amount = 0
        
        const transform = this.cube.transform.matrix
        const orientation = DirectionAngle[this.direction]
        const origin = quat.transform([0.6,1.5,0], orientation, this.origin)
        const target = quat.transform([this.range*2,1.5,0], orientation, this.target)
        mat4.transform(origin, transform, origin)
        mat4.transform(target, transform, target)
        
        this.cone = BatchMesh.create(SharedSystem.geometry.cone)
        this.cone.material = SharedSystem.materials.absorbTealMaterial
        this.cone.transform = this.context.get(TransformSystem).create(origin)
        const direction = vec3.subtract(target, origin, vec3())
        quat.rotation([0,-1,0], direction, this.cone.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.center.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.center.transform.position)
        this.context.get(ParticleEffectPass).add(this.center)

        this.flash = Sprite.create(BillboardType.Sphere)
        this.flash.material = SharedSystem.materials.sprite.rays
        this.flash.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.ring = Sprite.create(BillboardType.Sphere)
        this.ring.material = SharedSystem.materials.sprite.ring
        this.ring.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(ParticleEffectPass).add(this.ring)

        vec3.copy(origin, this.beam.path[0])
        this.context.get(ParticleEffectPass).add(this.beam)

        this.light = this.context.get(PointLightPass).create([0.5,1,1])
        this.light.transform = this.context.get(TransformSystem).create(origin)


        this.energy = SharedSystem.particles.energy.add({
            uLifespan: [1,1.8,0,0],
            uOrigin: origin, uTarget: vec3.ZERO,
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: [0.4,0.8],
            uRadius: [8,12],
            uForce: vec2.ZERO
        })

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.5,1,-0.2,0],
            uOrigin: origin, uTarget: vec3.ZERO,
            uLength: [0.2,0.4],
            uGravity: [0,-9.8,0],
            uSize: [0.1,0.4],
            uRadius: [0.2,0.5],
            uForce: [4,10]
        })

        this.smoke = this.smoke || SharedSystem.particles.smoke.add({
            uOrigin: origin,
            uLifespan: [1.6,2,-1,0],
            uRotation: [0,2*Math.PI],
            uGravity: [0,3.2,0],
            uSize: [1,3],
            uFieldDomain: vec4.ONE,
            uFieldStrength: vec2.ZERO
        })

        const damage = EventTrigger(targets.map(value => ({ frame: 1.6, value })), CubeSkill.damage)
        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'beam.path.1': PropertyAnimation([
                { frame: 1.3, value: origin },
                { frame: 1.6, value: target, ease: ease.cubicOut }
            ], vec3.lerp)
        })

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.energy.remove(this.energy)
        SharedSystem.particles.sparks.remove(this.sparks)
        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.center)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.center.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(PointLightPass).delete(this.light)
        Sprite.delete(this.ring)
        Sprite.delete(this.flash)
        BatchMesh.delete(this.cone)
    }
    protected clear(): void {
        if(this.smoke) this.smoke = void SharedSystem.particles.smoke.remove(this.smoke)
    }
}