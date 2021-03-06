import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEmitter } from '../../../engine/particles'
import { ParticleEffectPass, PostEffectPass, PointLightPass, PointLight, DecalPass, Decal } from '../../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activateVariant'),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.2, value: vec3.ZERO },
        { frame: 1.2, value: [6,6,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.2, value: [0.5,1,0.8,1] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'heat.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [2,0,2] },
        { frame: 1.6, value: [3,8,3], ease: ease.cubicOut }
    ], vec3.lerp),
    'heat.color': PropertyAnimation([
        { frame: 0.2, value: [0.2,1,1,1] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.3, value: 0 },
        { frame: 1.4, value: 5, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.3, value: 10 },
        { frame: 1.4, value: 0, ease: ease.quadIn }
    ], lerp),
    'corridor.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [1.5,0,2] },
        { frame: 1.0, value: [1.5,6,2], ease: ease.sineOut }
    ], vec3.lerp),
    'corridor.color': PropertyAnimation([
        { frame: 0.2, value: [0.2,1,1,1] },
        { frame: 1.0, value: [0,1,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'fire': EventTrigger([
        { frame: 0.2, value: 48 }
    ], EventTrigger.emit),
    'lineA.color': PropertyAnimation([
        { frame: 0.4, value: [0.2,1,0.8,1] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'lineB.color': PropertyAnimation([
        { frame: 0.4, value: [0.2,1,0.8,1] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'burn.transform.scale': PropertyAnimation([
        { frame: 0, value: [10,4,5] }
    ], vec3.lerp),
    'burn.color': PropertyAnimation([
        { frame: 0.4, value: vec4.ZERO },
        { frame: 1.0, value: [0,0,0,1], ease: ease.sineOut },
        { frame: 1.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp)
}

export class FlamethrowerSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 4
    readonly cardinal: boolean = true
    readonly pierce: boolean = true
    readonly damageType: DamageType = DamageType.Temperature | DamageType.Corrosion
    readonly damage: number = 2

    public validate(origin: vec2, target: vec2): boolean {
        const dx = Math.max(target[0] - origin[0] - 1, origin[0] - target[0])
        const dy = Math.max(target[1] - origin[1] - 1, origin[1] - target[1])
        return Math.max(dx, dy) <= this.range && Math.min(dx, dy) == 0
    }

    private corridor: BatchMesh
    private fire: ParticleEmitter
    private lineA: Line
    private lineB: Line
    private burn: Decal
    private light: PointLight
    private heat: BatchMesh
    private ring: Sprite
    private mesh: Mesh

    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        for(const generator = source.rotate(target, true); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }
        this.mesh = source.mesh
        this.corridor = BatchMesh.create(SharedSystem.geometry.openBox)
        this.corridor.material = SharedSystem.materials.effect.coreYellow
        this.corridor.transform = this.context.get(TransformSystem)
        .create([0,1.2,0], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.corridor)

        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.4,0.8,-0.3,0),
            uOrigin: mat4.transform([0,1,1], this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: mat4.transformNormal([0,0,12], this.mesh.transform.matrix, vec3()),
            uSize: vec2(0.5,1.5), uRadius: vec2(0,1.5)
        })

        this.lineA = Line.create(2, 0, 1.6)
        this.lineB = Line.create(2, 0, 1.6)

        mat4.transform([0,1.3,0], this.mesh.transform.matrix, this.lineA.path[0])
        mat4.transform([0,1.7,0], this.mesh.transform.matrix, this.lineB.path[0])
        mat4.transform([0,1.3,10], this.mesh.transform.matrix, this.lineA.path[1])
        mat4.transform([0,1.7,10], this.mesh.transform.matrix, this.lineB.path[1])

        this.lineA.material = SharedSystem.materials.effect.exhaust
        this.lineB.material = SharedSystem.materials.effect.exhaust
        this.context.get(ParticleEffectPass).add(this.lineA)
        this.context.get(ParticleEffectPass).add(this.lineB)

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.material = SharedSystem.materials.decal.dust
        this.burn.transform = this.context.get(TransformSystem)
        .create([0,0,6],quat.axisAngle(vec3.AXIS_Y,-0.5*Math.PI,quat()),vec3.ONE,this.mesh.transform)

        this.light = this.context.get(PointLightPass).create([0.2,1,0.6])
        this.light.transform = this.context.get(TransformSystem)
        .create([0,2,2], quat.IDENTITY, vec3.ONE, this.mesh.transform)

        this.heat = BatchMesh.create(SharedSystem.geometry.openBox)
        this.heat.material = SharedSystem.materials.heat
        this.heat.transform = this.context.get(TransformSystem)
        .create([0,1,0], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.context.get(PostEffectPass).add(this.heat)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.effect.auraTeal
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,1,1.5], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        const damage = EventTrigger([{ frame: 0.8, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'lineA.path.1': PropertyAnimation([
                { frame: 0.4, value: this.lineA.path[0] },
                { frame: 1.4, value: vec3.copy(this.lineA.path[1], vec3()), ease: ease.quartOut }
            ], vec3.lerp),
            'lineB.path.1': PropertyAnimation([
                { frame: 0.4, value: this.lineB.path[0] },
                { frame: 1.4, value: vec3.copy(this.lineB.path[1], vec3()), ease: ease.quartOut }
            ], vec3.lerp)
        })
        this.context.get(AudioSystem).create(`assets/flamethrower_use.mp3`, 'sfx', this.mesh.transform).play(0)

        for(const duration = 1.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.corridor.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.heat.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        SharedSystem.particles.fire.remove(this.fire)
        this.context.get(PostEffectPass).remove(this.heat)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(ParticleEffectPass).remove(this.corridor)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.lineA)
        this.context.get(ParticleEffectPass).remove(this.lineB)
        Sprite.delete(this.ring)
        BatchMesh.delete(this.heat)
        BatchMesh.delete(this.corridor)
        Line.delete(this.lineA)
        Line.delete(this.lineB)
    }
}