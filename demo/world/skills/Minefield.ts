import { Application } from '../../engine/framework'
import { vec2, vec3, vec4, lerp, quat } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { ParticleEmitter } from '../../engine/particles'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { ParticleEffectPass, PointLightPass, DecalPass, PostEffectPass, PointLight, Decal } from '../../engine/pipeline'
import { SpriteMaterial } from '../../engine/materials'
import { SharedSystem } from '../shared'
import { TerrainSystem } from '../terrain'
import { TurnBasedSystem, IAgent } from '../common'
import { DamageType, AIUnit, UnitSkill } from '../military'

const actionTimeline = {
    'spark.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.2, value: [16,16,16], ease: ease.quintOut },
    ], vec3.lerp),
    'spark.color': PropertyAnimation([
        { frame: 0, value: [1,0.8,0.8,0] },
        { frame: 0.2, value: vec3.ZERO, ease: ease.sineIn },
    ], vec4.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 0.0, value: vec3.ZERO },
        { frame: 0.6, value: [4,4,4], ease: ease.quintOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0.4, value: vec4.ONE },
        { frame: 0.6, value: vec4.ZERO, ease: ease.quadOut }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,5,0] },
        { frame: 0.8, value: [10,5,10], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.8, value: [1,1,1,0], ease: ease.linear }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.4, value: 12, ease: ease.quintOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 6 },
        { frame: 0.4, value: 0, ease: ease.sineIn }
    ], lerp),
    'perimeter.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,4,0] },
        { frame: 0.5, value: [18,4,18], ease: ease.expoOut }
    ], vec3.lerp),
    'perimeter.color': PropertyAnimation([
        { frame: 0, value: [1,0.8,0.5,0.5] },
        { frame: 0.5, value: [0,0,0,0.5], ease: ease.cubicIn },
        { frame: 2.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.3, value: [20,20,20], ease: ease.quartOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.3, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'burn.transform.scale': PropertyAnimation([
        { frame: 0, value: [8,2,8] }
    ], vec3.lerp),
    'burn.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.8, value: [0,0,0,1], ease: ease.cubicIn },
        { frame: 3, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'smoke': EventTrigger([{ frame: 0, value: 36 }], EventTrigger.emit),
    'particles': EventTrigger([{ frame: 0, value: 64 }], EventTrigger.emit),
    'pillar.color': PropertyAnimation([
        { frame: 0, value: [1,0.5,0.6,0.8] },
        { frame: 0.2, value: vec4.ZERO, ease: ease.quadOut }
    ], vec4.lerp)
}

const activateTimeline = {
    'pillar.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [2,5,2], ease: ease.quadOut }
    ], vec3.lerp),
    'pillar.color': PropertyAnimation([
        { frame: 0, value: [1,0.5,0.6,0.8] }
    ], vec4.lerp),
    'circle.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [4,4,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'circle.color': PropertyAnimation([
        { frame: 0, value: [1,0.5,0.7,1] },
        { frame: 0.5, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

export class LandMine extends UnitSkill {
    static readonly pool: LandMine[] = []
    readonly tile: vec2 = vec2()
    readonly damageType = DamageType.Kinetic | DamageType.Temperature
    range: number = 4
    damage: number = 2

    public mesh: Mesh
    public triggered: boolean = false
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel('mine')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.mesh.transform.position)
    }
    public delete(){
        this.triggered = false
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        LandMine.pool.push(this)
    }
    private pillar: Sprite
    private circle: Sprite
    public *trigger(): Generator<ActionSignal> {
        this.triggered = true
        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.raysBeam
        this.pillar.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.circle = Sprite.create(BillboardType.None)
        this.circle.material = new SpriteMaterial()
        this.circle.material.program = this.context.get(ParticleEffectPass).program
        this.circle.material.diffuse = SharedSystem.textures.ring
        this.circle.transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.circle)

        const animate = AnimationTimeline(this, activateTimeline)

        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        this.context.get(TransformSystem).delete(this.circle.transform)
        this.context.get(ParticleEffectPass).remove(this.circle)
        Sprite.delete(this.circle)
    }
    private ring: BatchMesh
    private light: PointLight
    private burn: Decal
    private smoke: ParticleEmitter
    private wave: Sprite
    private core: BatchMesh
    private spark: Sprite
    private particles: ParticleEmitter
    private perimeter: Decal
    public *detonate(): Generator<ActionSignal> {
        vec4.copy(vec4.ZERO, this.mesh.color)
        const origin = this.mesh.transform.position, temp = vec3()
        
        this.core = BatchMesh.create(SharedSystem.geometry.lowpolySphere, 4)
        this.core.material = SharedSystem.materials.coreWhiteMaterial
        this.core.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(ParticleEffectPass).add(this.core)

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.distortion.ring
        this.wave.transform = this.context.get(TransformSystem).create(vec3.add([0,2,0], origin, temp), Sprite.FlatDown, vec3.ONE)
        this.context.get(PostEffectPass).add(this.wave)

        this.ring = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.ring.material = SharedSystem.materials.ringDustMaterial
        this.ring.transform = this.context.get(TransformSystem).create(origin)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.spark = Sprite.create(BillboardType.Sphere)
        this.spark.material = SharedSystem.materials.sprite.rays
        this.spark.transform = this.context.get(TransformSystem).create(vec3.add(vec3.AXIS_Y, origin, temp))
        this.context.get(ParticleEffectPass).add(this.spark)
    
        this.burn = this.context.get(DecalPass).create(0)
        this.burn.material = SharedSystem.materials.decal.glow
        this.burn.transform = this.context.get(TransformSystem).create(origin)

        this.perimeter = this.context.get(DecalPass).create(0)
        this.perimeter.material = SharedSystem.materials.decal.halo
        this.perimeter.transform = this.context.get(TransformSystem).create(origin)     

        this.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [1.5,2,-0.5,0],
            uOrigin: vec3.add([0,-0.8,0], origin, temp),
            uRotation: [0,2*Math.PI],
            uGravity: [0,4.8,0],
            uSize: [2,6],
            uFieldDomain: [0.2,0.2,0.2,0],
            uFieldStrength: [8,0]
        })

        this.particles = SharedSystem.particles.embers.add({
            uLifespan: [0.6,0.9,-0.3,0],
            uOrigin: origin,
            uRotation: vec2.ZERO, uGravity: vec3(0,-9.8*3,0),
            uSize: [0.2,0.8],
            uRadius: [0.5,1],
            uOrientation: quat.IDENTITY,
            uForce: [14,28],
            uTarget: [0,-0.5,0]
        })

        this.light = this.context.get(PointLightPass).create([1,0.5,0.5])
        this.light.transform = this.context.get(TransformSystem).create(vec3.add([0,2,0], origin, temp))

        const damage = EventTrigger(UnitSkill.queryArea(this.context, this.tile, -1, this.range, 2)
        .map(value => ({ frame: 0.4, value })), UnitSkill.damage)
        const animate = AnimationTimeline(this, actionTimeline)
        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.spark.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.perimeter.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        SharedSystem.particles.smoke.remove(this.smoke)
        SharedSystem.particles.embers.remove(this.particles)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.spark)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(DecalPass).delete(this.perimeter)
        BatchMesh.delete(this.core)
        BatchMesh.delete(this.ring)
        Sprite.delete(this.spark)
        Sprite.delete(this.wave)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        Sprite.delete(this.pillar)
        this.delete()
    }
}

export class Minefield implements IAgent {
    readonly order: number = 3
    list: LandMine[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
        this.context.get(TurnBasedSystem).signalEnterTile.add((column: number, row: number, unit: AIUnit) => {
            if(!(unit instanceof AIUnit)) return
            const mine = this.get(column, row)
            if(!mine || mine.triggered) return
            mine.triggered = true
            this.context.get(TurnBasedSystem).enqueue(mine.trigger(), true)
        })
    }
    public execute(): Generator<ActionSignal> {
        const bounds = this.context.get(TerrainSystem).bounds
        const actions = []
        for(let i = this.list.length - 1; i >= 0; i--){
            const mine = this.list[i]
            if(mine.tile[0] < bounds[0] || mine.tile[1] < bounds[1] || mine.tile[0] >= bounds[2] || mine.tile[1] >= bounds[3])
                mine.delete()
            else if(mine.triggered)
                actions.push(mine.detonate())
            else continue
            this.list.splice(i, 1)
        }
        return actions.length ? AnimationSystem.zip(actions) : null
    }
    public get(column: number, row: number): LandMine | null {
        for(let i = this.list.length - 1; i >= 0; i--)
            if(this.list[i].tile[0] === column && this.list[i].tile[1] === row) return this.list[i]
    }
    create(column: number, row: number): LandMine {
        if(this.get(column, row)) return null
        const item = LandMine.pool.pop() || new LandMine(this.context)
        item.place(column, row)
        this.list.push(item)
        return item
    }
}