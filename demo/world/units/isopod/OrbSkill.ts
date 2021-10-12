import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat } from '../../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { TransformSystem, Transform } from '../../../engine/scene'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { DecalMaterial, SpriteMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIUnitSkill } from '../../opponent'
import { StaticOrb } from './StaticOrb'

export class OrbSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 2
    public readonly cardinal: boolean = true
    public readonly damage: number = 0

    private funnel: BatchMesh
    private core: BatchMesh
    private cone: BatchMesh
    private beam: Sprite
    private light: PointLight
    private bulge: Sprite
    private ring: Sprite
    private mesh: Mesh
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        target = vec2.add([0,1], source.tile, vec2())

        this.funnel = new BatchMesh(SharedSystem.geometry.funnel)
        this.funnel.transform = this.context.get(TransformSystem)
        .create([0,0.7,0.8],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.funnel.material = SharedSystem.materials.coneTealMaterial
        this.context.get(ParticleEffectPass).add(this.funnel)

        this.core = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        this.core.transform = this.context.get(TransformSystem)
        .create([0,0.7,2.5],Sprite.FlatDown,vec3.ONE,this.mesh.transform)
        this.core.material = SharedSystem.materials.coreYellowMaterial
        this.context.get(ParticleEffectPass).add(this.core)

        this.cone = new BatchMesh(SharedSystem.geometry.cone)
        this.cone.transform = this.context.get(TransformSystem)
        .create([0,0.7,0.8],Sprite.FlatDown,vec3.ONE,this.mesh.transform)
        this.cone.material = new SpriteMaterial()
        this.cone.material.program = this.context.get(ParticleEffectPass).program
        this.cone.material.diffuse = SharedSystem.textures.wind
        this.context.get(ParticleEffectPass).add(this.cone)

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.beam.origin)
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,1,2.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        this.bulge = new Sprite()
        this.bulge.billboard = BillboardType.Sphere
        this.bulge.material = new SpriteMaterial()
        this.bulge.material.blendMode = null
        this.bulge.material.program = SharedSystem.materials.chromaticAberration
        this.bulge.material.diffuse = SharedSystem.textures.bulge
        this.bulge.transform = this.context.get(TransformSystem)
        .create([0,0.7,2.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.bulge)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,0.7,1.5],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [0,0,0] },
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
            ], vec4.lerp),
            '': EventTrigger([{ frame: 1.0, value: new StaticOrb(this.context) }], (root, orb) => {
                if(orb.enabled) return
                orb.place(source.tile[0], source.tile[1] + 1)
                this.context.get(AnimationSystem).start(orb.appear(this.mesh.transform.position), true)
            })
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
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
    }
}