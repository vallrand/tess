import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat } from '../../../engine/math'
import { Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { SpriteMaterial, DecalMaterial } from '../../../engine/materials'
import { TransformSystem } from '../../../engine/scene'
import { doubleSided } from '../../../engine/geometry'
import { ParticleEmitter } from '../../../engine/particles'
import { PointLightPass, PointLight, DecalPass, Decal, ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'

const actionTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'core.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.5, value: [4,-4,4], ease: ease.quadOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,0.8,1,0.4] },
        { frame: 1.5, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.6, value: 0 },
        { frame: 1.4, value: 8, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.6, value: 8 },
        { frame: 1.4, value: 0, ease: ease.quadIn }
    ], lerp),
    'bolts': EventTrigger([
        { frame: 0.8, value: 48 }
    ], EventTrigger.emit),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.7, value: vec3.ZERO },
        { frame: 1.2, value: [3,8,3], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.7, value: [0.6,0.6,1,0.4] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cracks.transform.rotation': EventTrigger([
        { frame: 0, value: null }
    ], (rotation: quat) => quat.axisAngle(vec3.AXIS_Y, 2*Math.PI*SharedSystem.random(), rotation)),
    'cracks.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [12,4,12] }
    ], vec3.lerp),
    'cracks.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,0.6,1,1] }
    ], vec4.lerp),
    'cracks.threshold': PropertyAnimation([
        { frame: 0.8, value: -3 },
        { frame: 1.0, value: 0, ease: ease.quadOut },
        { frame: 2.0, value: 3, ease: ease.quartIn }
    ], lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [10,10,10], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0.8, value: vec4.ONE },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.4, value: [10,10,10], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,0.4,1,0] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'cylinder.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [4,1,4] },
        { frame: 1.0, value: [0,6,0], ease: ease.sineOut }
    ], vec3.lerp),
    'cylinder.color': PropertyAnimation([
        { frame: 0.4, value: vec4.ZERO },
        { frame: 1.0, value: [0.4,0.2,1,1], ease: ease.cubicOut },
    ], vec4.lerp),
    'pillar.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [0,-8,0] },
        { frame: 1.4, value: [5,-2,5], ease: ease.cubicOut }
    ], vec3.lerp),
    'pillar.color': PropertyAnimation([
        { frame: 0.8, value: [0.8,0.6,1,0.4] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

export class WaveSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 3
    readonly cardinal: boolean = false
    readonly pierce: boolean = false
    readonly damageType: DamageType = DamageType.Electric
    readonly damage: number = 4

    private beam: Sprite
    private cracks: Decal
    private wave: Sprite
    private ring: Sprite
    private cylinder: BatchMesh
    private pillar: BatchMesh
    private bolts: ParticleEmitter
    private light: PointLight
    private core: BatchMesh
    private mesh: Mesh
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem)
        .create([0,0,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)
    
        this.cracks = this.context.get(DecalPass).create(4)
        this.cracks.material = new DecalMaterial()
        this.cracks.material.program = this.context.get(DecalPass).program
        this.cracks.material.diffuse = SharedSystem.textures.cracks
        this.cracks.material.normal = SharedSystem.textures.cracksNormal
        this.cracks.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.mesh.transform)
    
        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.displacement.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(PostEffectPass).add(this.wave)
    
        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,0.5,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)
    
        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.stripesMaterial
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,2,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)
    
        this.pillar = BatchMesh.create(SharedSystem.geometry.lopolyCylinderFlip)
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.raysWrap
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,0,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)
    
        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,1,0], this.mesh.transform.position, vec3()),
            uRadius: [2,4],
            uLifespan: [0.2,0.8,-0.4,0],
            uGravity: vec3.ZERO,
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.4,1.6],
            uFrame: [16,4]
        })
    
        this.light = this.context.get(PointLightPass).create([0.7,0.6,1])
        this.light.transform = this.context.get(TransformSystem)
        .create([0,4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
    
        this.core = new BatchMesh(doubleSided(SharedSystem.geometry.lowpolySphere))
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem)
        .create([0,1,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)
    
        const animate = AnimationTimeline(this, actionTimeline)
        //const damage = EventTrigger([{ frame: 0, value: this.query() }])

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.cracks.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
    
        SharedSystem.particles.bolts.remove(this.bolts)
        this.context.get(DecalPass).delete(this.cracks)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.core)

        Sprite.delete(this.beam)
        Sprite.delete(this.wave)
        Sprite.delete(this.ring)
        BatchMesh.delete(this.cylinder)
        BatchMesh.delete(this.pillar)
    }
}