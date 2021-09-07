import { Application } from '../../engine/framework'
import { ease, vec2, vec3, vec4, lerp, mat4, quat } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { TransformSystem, AnimationSystem, ActionSignal } from '../../engine/scene'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger } from '../../engine/scene/Animation'
import { ParticleEffectPass, PointLightPass, DecalPass, PostEffectPass, PointLight, Decal } from '../../engine/pipeline'
import { EffectMaterial, DecalMaterial, SpriteMaterial } from '../../engine/materials'
import { SharedSystem } from '../shared'
import { TerrainSystem } from '../terrain'

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
    'smoke': EmitterTrigger({ frame: 0, value: 36 }),
    'particles': EmitterTrigger({ frame: 0, value: 64 }),
}

interface ExplosionEffect {
    ring: BatchMesh
    light: PointLight
    burn: Decal
    smoke: ParticleEmitter
    wave: Sprite
    core: BatchMesh
    spark: Sprite
    particles: ParticleEmitter
    perimeter: Decal
}

export class Minefield {
    pool: ExplosionEffect[] = []
    list: LandMine[] = []
    coreMaterial: EffectMaterial<any>
    burnMaterial: DecalMaterial
    perimeterMaterial: DecalMaterial
    waveMaterial: SpriteMaterial
    ringMaterial: EffectMaterial<any>
    sparkMaterial: SpriteMaterial

    constructor(private readonly context: Application){
        this.coreMaterial = new EffectMaterial(this.context.gl, {
            FRESNEL: true, PANNING: true, GRADIENT: true, GREYSCALE: true
        }, {
            uUVTransform: vec4(0,0,2,1.7),
            uUVPanning: vec2(-0.1,0.9),
            uFresnelMask: vec2(0.2,0.6),
            uColorAdjustment: vec3(1,0.9,0),
            uUV2Transform: vec4(0,0.7,3,2.9),
            uUV2Panning: vec2(0.1,0.7),
        })
        this.coreMaterial.diffuse = SharedSystem.textures.sineNoise
        this.coreMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffffff, 0xffffffff, 0xffffafef, 0xffffafaf, 0xffaf9f7f, 0xe0808060, 0xa0202040, 0x00000000
        ], 1)
        
        this.burnMaterial = new DecalMaterial()
        this.burnMaterial.diffuse = SharedSystem.textures.glow

        this.perimeterMaterial = new DecalMaterial()
        this.perimeterMaterial.diffuse = SharedSystem.textures.raysRing

        this.waveMaterial = new SpriteMaterial()
        this.waveMaterial.blendMode = null
        this.waveMaterial.program = SharedSystem.materials.chromaticAberration
        this.waveMaterial.diffuse = SharedSystem.textures.ring

        this.ringMaterial = new EffectMaterial(this.context.gl, {
            PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true, VERTICAL_MASK: true
        }, {
            uUVTransform: vec4(0,0,1,0.6),
            uUVPanning: vec2(-0.3,-0.04),
            uDissolveColor: vec4.ZERO,
            uDissolveThreshold: vec3(0,0.04,0),
            uColorAdjustment: vec3(1,0.64,0.1),
            uUV2Transform: vec4(0,0,1,1.7),
            uUV2Panning: vec2(-0.5,0.1),
            uVerticalMask: vec4(0.4,0.5,0.9,1.0),
        })
        this.ringMaterial.diffuse = SharedSystem.textures.cellularNoise
        this.ringMaterial.gradient = GradientRamp(this.context.gl, [
            0xf5f0d700, 0xbd7d7d00, 0x524747ff, 0x00000000,
            0x7f7f7fff, 0x202020ff, 0x000000ff, 0x00000000
        ], 2)

        this.sparkMaterial = new SpriteMaterial()
        this.sparkMaterial.program = this.context.get(ParticleEffectPass).program
        this.sparkMaterial.diffuse = SharedSystem.textures.rays
    }
    create(): LandMine {
        const item = new LandMine(this.context, this)
        this.list.push(item)
        if(this.list.length > 2) this.list[0].activate()
        return item
    }
    activate(mine: LandMine){
        const index = this.list.indexOf(mine)
        this.list.splice(index, 1)
        this.context.get(AnimationSystem).start(this.detonate(mine))
    }
    private createExplosion(): ExplosionEffect {
        if(this.pool.length) return this.pool.pop()

        const core = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        core.order = 4
        core.material = this.coreMaterial

        const wave = new Sprite()
        wave.billboard = BillboardType.None
        wave.material = this.waveMaterial

        const ring = new BatchMesh(SharedSystem.geometry.cylinder)
        ring.material = this.ringMaterial

        const spark = new Sprite()
        spark.billboard = BillboardType.Sphere
        spark.material = this.sparkMaterial

        return {
            core, wave, ring, spark,
            light: null, burn: null, perimeter: null, particles: null, smoke: null
        }
    }
    private *detonate(mine: LandMine): Generator<ActionSignal> {
        const origin = mat4.transform(vec3.ZERO, mine.mesh.transform.matrix, vec3())
        mine.kill()
        const effect = this.createExplosion()

        effect.core.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, effect.core.transform.position)
        this.context.get(ParticleEffectPass).add(effect.core)
        
        effect.burn = this.context.get(DecalPass).create(0)
        effect.burn.material = this.burnMaterial
        effect.burn.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, effect.burn.transform.position)

        effect.perimeter = this.context.get(DecalPass).create(0)
        effect.perimeter.material = this.perimeterMaterial
        effect.perimeter.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, effect.perimeter.transform.position)

        effect.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [1.5,2,-0.5,0],
            uOrigin: vec3.add(origin,[0,-0.8,0],vec3()),
            uRotation: [0,2*Math.PI],
            uGravity: [0,4.8,0],
            uSize: [2,6],
            uFieldDomain: [0.2,0.2,0.2,0],
            uFieldStrength: [8,0]
        })

        effect.particles = SharedSystem.particles.embers.add({
            uLifespan: [0.6,0.9,-0.3,0],
            uOrigin: origin,
            uRotation: vec2.ZERO, uGravity: vec3(0,-9.8*3,0),
            uSize: [0.2,0.8],
            uRadius: [0.5,1],
            uOrientation: quat.IDENTITY,
            uForce: [14,28],
            uTarget: vec3.add(origin, [0,-0.5,0], vec3()),
        })

        effect.light = this.context.get(PointLightPass).create()
        effect.light.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,2,0], effect.light.transform.position)
        vec3.set(1,0.5,0.5, effect.light.color)

        effect.wave.transform = this.context.get(TransformSystem).create()
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, effect.wave.transform.rotation)
        vec3.add(origin, [0,2,0], effect.wave.transform.position)
        this.context.get(PostEffectPass).add(effect.wave)

        effect.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, effect.ring.transform.position)
        this.context.get(ParticleEffectPass).add(effect.ring)

        effect.spark.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,1,0], effect.spark.transform.position)
        this.context.get(ParticleEffectPass).add(effect.spark)

        const animate = AnimationTimeline(effect, actionTimeline)

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(effect.wave.transform)
        this.context.get(TransformSystem).delete(effect.spark.transform)
        this.context.get(TransformSystem).delete(effect.ring.transform)
        this.context.get(TransformSystem).delete(effect.perimeter.transform)
        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.core.transform)
        this.context.get(TransformSystem).delete(effect.burn.transform)

        SharedSystem.particles.smoke.remove(effect.smoke)
        SharedSystem.particles.embers.remove(effect.particles)

        this.context.get(PostEffectPass).remove(effect.wave)
        this.context.get(ParticleEffectPass).remove(effect.spark)
        this.context.get(ParticleEffectPass).remove(effect.core)
        this.context.get(ParticleEffectPass).remove(effect.ring)
        this.context.get(PointLightPass).delete(effect.light)
        this.context.get(DecalPass).delete(effect.burn)
        this.context.get(DecalPass).delete(effect.perimeter)
        this.pool.push(effect)
    }
}

export class LandMine {
    public mesh: Mesh
    public tile: vec2 = vec2()
    public get enabled(): boolean { return !!this.mesh }
    constructor(private readonly context: Application, private readonly parent: Minefield){}
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel('mine')
        this.mesh.transform = this.context.get(TransformSystem).create()

        this.context.get(TerrainSystem).tilePosition(column, row, this.mesh.transform.position)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null
    }
    activate(): void {
        this.parent.activate(this)
    }
}