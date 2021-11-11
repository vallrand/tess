import { lerp, vec2, vec3, vec4, quat } from '../../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { TransformSystem, Transform } from '../../../engine/scene'
import { ParticleEmitter } from '../../../engine/particles'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { ActionSignal, PropertyAnimation, AnimationTimeline, ease } from '../../../engine/animation'

import { SharedSystem, ModelAnimation } from '../../shared'
import { TerrainSystem } from '../../terrain'
import { PlayerSystem, CubeModule } from '../../player'
import { AIUnit, AIUnitSkill, DamageType, UnitSkill, IUnitAttribute } from '../../military'
import { TurnBasedSystem } from '../../common'

class StaticOrb extends UnitSkill {
    static readonly pool: StaticOrb[] = []
    readonly tile: vec2 = vec2()
    readonly direction: vec2 = vec2()
    readonly damageType: DamageType = DamageType.Electric | DamageType.Corrosion
    readonly damage: number = 1
    readonly health: IUnitAttribute = { capacity: 4, amount: 0 }
    readonly group: number = 1
    readonly range: number = 1

    private transform: Transform
    private orb: Mesh
    private decal: Decal
    private bolts: ParticleEmitter
    
    public place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.health.amount = this.health.capacity
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], this.transform.position)

        this.orb = Mesh.create(SharedSystem.geometry.sphereMesh, 4, 8)
        this.context.get(MeshSystem).list.push(this.orb)
        this.orb.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.transform)
        this.orb.material = SharedSystem.materials.mesh.orb

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ZERO, this.transform)
        this.decal.material = SharedSystem.materials.corrosionMaterial

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,0.5,0], this.transform.position, vec3()),
            uLifespan: [0.2,0.4,0,0],
            uRadius: [0.6,1.2], uRotation: [0,2*Math.PI],
            uGravity: vec3.ZERO, uOrientation: quat.IDENTITY,
            uSize: [0.5,2], uFrame: [0,4]
        })
    }
    public delete(): void {
        this.transform = void this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.decal = void this.context.get(DecalPass).delete(this.decal)
        this.orb = null
        this.bolts = void SharedSystem.particles.bolts.remove(this.bolts)
        StaticOrb.pool.push(this)
    }
    public *move(target: vec2): Generator<ActionSignal> {
        const prevPosition = vec3.copy(this.transform.position, vec3())
        const nextPosition = this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], vec3())
        const animate = AnimationTimeline(this, {
            'transform.position': PropertyAnimation([
                { frame: 0, value: prevPosition },
                { frame: 1, value: nextPosition, ease: ease.quadInOut }
            ], vec3.lerp),
            'bolts.uniform.uniforms.uOrigin': PropertyAnimation([
                { frame: 0.5, value: vec3.add([0,0.5,0], nextPosition, vec3()) }
            ], vec3.lerp)
        })
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        if(target) UnitSkill.damage(this, target)
    }
    public *appear(origin: vec3, delay: number): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'transform.position': PropertyAnimation([
                { frame: 0, value: vec3(this.transform.position[0], origin[1] + 0.7, this.transform.position[2]) },
                { frame: 0.5, value: vec3.copy(this.transform.position, vec3()), ease: ease.quadIn }
            ], vec3.lerp),
            'decal.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.5, value: [8,8,8], ease: ease.cubicOut }
            ], vec3.lerp),
            'decal.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] }
            ], vec4.lerp),
            'orb.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] }
            ], vec4.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.5, value: vec3.ONE, ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp),
            'bolts.rate': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 0.2, value: 0.02, ease: ease.stepped }
            ], lerp)
        })
        for(const duration = 0.5, startTime = this.context.currentTime + delay; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        UnitSkill.damage(this, this.tile)
    }
    public *dissolve(): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'bolts.rate': PropertyAnimation([
                { frame: 0, value: 0 }
            ], lerp),
            'orb.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] },
                { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'decal.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] },
                { frame: 1, value: [0,1,1,0], ease: ease.sineOut }
            ], vec4.lerp)
        })
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        this.delete()
    }
}

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [8,8,8], ease: ease.quadOut }
    ], vec3.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0.8, value: quat.IDENTITY },
        { frame: 1.4, value: quat.axisAngle(vec3.AXIS_Z, Math.PI, quat()), ease: ease.sineIn }
    ], quat.slerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.8,0.2,1,0.4] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'bulge.transform.scale': PropertyAnimation([
        { frame: 1.0, value: vec3.ZERO },
        { frame: 1.8, value: [10,10,10], ease: ease.cubicOut }
    ], vec3.lerp),
    'bulge.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.8, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.8, value: 0 },
        { frame: 1.6, value: 5, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.8, value: 6 },
        { frame: 1.6, value: 0, ease: ease.sineIn }
    ], lerp),
    'light.color': PropertyAnimation([
        { frame: 1.0, value: [0.4,0.2,1] }
    ], vec3.lerp),
    'beam.transform.position': PropertyAnimation([
        { frame: 0, value: [0,-0.5,0] },
        { frame: 0.6, value: [0,0.7,1.8], ease: ease.quadInOut }
    ], vec3.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.2, value: vec3.ZERO },
        { frame: 0.8, value: [1.5,6,1.5], ease: ease.quartOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.2, value: [1,0.6,1,0] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'funnel.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [0,0,-2] },
        { frame: 1.4, value: [0.6,0.6,-0.6], ease: ease.quadInOut }
    ], vec3.lerp),
    'funnel.color': PropertyAnimation([
        { frame: 0.8, value: [0.8,0.2,1,1], ease: ease.cubicOut },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.6, value: [1.5,1.5,1.5], ease: ease.quadOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0.8, value: [0.4,0.2,1,1] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [0,1,0] },
        { frame: 1.2, value: [0.6,4,0.6], ease: ease.sineOut }
    ], vec3.lerp),
    'cone.transform.rotation': PropertyAnimation([
        { frame: 0.6, value: Sprite.FlatDown },
        { frame: 1.2, value: quat.multiply(Sprite.FlatDown, quat.axisAngle(vec3.AXIS_Y, Math.PI, quat()), quat()), ease: ease.quadOut }
    ], quat.slerp),
    'cone.color': PropertyAnimation([
        { frame: 0.6, value: [0.4,0.6,1,1] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp)
}

export class StaticOrbSkill extends AIUnitSkill {
    private static readonly temp: vec2 = vec2()
    readonly cost: number = 1
    readonly range: number = 4
    readonly cardinal: boolean = true
    readonly pierce: boolean = false

    private funnel: BatchMesh
    private core: BatchMesh
    private cone: BatchMesh
    private beam: Sprite
    private light: PointLight
    private bulge: Sprite
    private ring: Sprite
    private mesh: Mesh

    public aim(origin: vec2, tiles: vec2[], threshold?: number): vec2 | null {
        if(threshold == null) return super.aim(origin, tiles, threshold)
        const target = StaticOrbSkill.temp
        for(let i = tiles.length - 1; i >= 0; i--){
            const dx = tiles[i][0] - origin[0]
            const dy = tiles[i][1] - origin[1]
            vec2.copy(origin, target)
            if(Math.abs(dx) > Math.abs(dy)) target[0] += this.range * Math.sign(dx)
            else target[1] += this.range * Math.sign(dy)
            if(vec2.manhattan(target, tiles[i]) < this.range) return target
        }
    }
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        for(const generator = source.rotate(target); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }
        this.mesh = source.mesh

        this.funnel = BatchMesh.create(SharedSystem.geometry.funnel)
        this.funnel.transform = this.context.get(TransformSystem)
        .create([0,0.7,0.8],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.funnel.material = SharedSystem.materials.effect.coneTeal
        this.context.get(ParticleEffectPass).add(this.funnel)

        this.core = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.core.transform = this.context.get(TransformSystem)
        .create([0,0.7,2.5],Sprite.FlatDown,vec3.ONE,this.mesh.transform)
        this.core.material = SharedSystem.materials.effect.coreYellow
        this.context.get(ParticleEffectPass).add(this.core)

        this.cone = BatchMesh.create(SharedSystem.geometry.cone)
        this.cone.transform = this.context.get(TransformSystem)
        .create([0,0.7,0.8],Sprite.FlatDown,vec3.ONE,this.mesh.transform)
        this.cone.material = SharedSystem.materials.sprite.spiral
        this.context.get(ParticleEffectPass).add(this.cone)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,1,2.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        this.bulge = Sprite.create(BillboardType.Sphere)
        this.bulge.material = SharedSystem.materials.distortion.bulge
        this.bulge.transform = this.context.get(TransformSystem)
        .create([0,0.7,2.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.bulge)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,0.7,1.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        const orb = StaticOrb.pool.pop() || new StaticOrb(this.context)
        orb.direction[0] = Math.sign(target[0] - source.tile[0])
        orb.direction[1] = Math.sign(target[1] - source.tile[1])
        orb.place(source.tile[0] + orb.direction[0], source.tile[1] + orb.direction[1])
        this.context.get(PlayerSystem).skills[CubeModule.Voidgun].corrosion.add(orb)
        this.context.get(TurnBasedSystem).enqueue(orb.appear(this.mesh.transform.position, 1), true)

        const animate = AnimationTimeline(this, actionTimeline)
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.funnel.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.bulge.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.bulge)
        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.funnel)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.ring)
        Sprite.delete(this.bulge)
        Sprite.delete(this.beam)
        Sprite.delete(this.ring)
        BatchMesh.delete(this.funnel)
        BatchMesh.delete(this.core)
        BatchMesh.delete(this.cone)
    }
}