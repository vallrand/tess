import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { AnimationSystem, ActionSignal, TransformSystem, Transform } from '../../engine/scene'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../engine/pipeline'
import { DecalMaterial, SpriteMaterial } from '../../engine/materials'
import { ParticleEmitter } from '../../engine/particles'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

class StaticOrb {
    readonly tile: vec2 = vec2()
    transform: Transform
    orb: Mesh
    bolts: ParticleEmitter
    constructor(private readonly context: Application){}
    public get enabled(): boolean { return !!this.orb }
    public place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], this.transform.position)

        this.orb = new Mesh()
        this.orb.buffer = SharedSystem.geometry.sphereMesh
        this.orb.order = 3
        this.orb.layer = 2
        this.context.get(MeshSystem).list.push(this.orb)
        this.orb.transform = this.context.get(TransformSystem).create()
        this.orb.transform.parent = this.transform

        this.orb.material = SharedSystem.materials.orbMaterial
        this.orb.color[0] = 0

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,0.5,0], this.transform.position, vec3()),
            uRadius: [0.6,1.2],
            uLifespan: [0.2,0.4,0,0],
            uGravity: vec3.ZERO,
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.5,2],
            uFrame: [0,4]
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.orb = null
        SharedSystem.particles.bolts.remove(this.bolts)
    }
    public *appear(origin: vec3): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'transform.position': PropertyAnimation([
                { frame: 0, value: vec3(this.transform.position[0], origin[1] + 0.7, this.transform.position[2]) },
                { frame: 0.5, value: vec3.copy(this.transform.position, vec3()), ease: ease.quadIn }
            ], vec3.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.5, value: vec3.ONE, ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp)
        })
        this.bolts.rate = 0.02
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(AnimationSystem).start(this.dissolve(), true)
    }
    public *dissolve(): Generator<ActionSignal> {
        this.bolts.rate = 0
        const animate = AnimationTimeline(this, {
            'orb.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] },
                { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        this.kill()
        // const index = this.parent.list.indexOf(this)
        // this.parent.list.splice(index, 1)
        // this.parent.pool.push(this)
    }
}

export class Isopod extends ControlUnit {
    private static readonly model: string = 'isopod'

    private dust: ParticleEmitter
    private shadow: Decal

    private funnel: BatchMesh
    private core: BatchMesh
    private cone: BatchMesh
    private beam: Sprite
    private light: PointLight
    private bulge: Sprite
    private ring: Sprite

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Isopod.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Isopod.model].activate(0, this.mesh.armature)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uLifespan: [0.6,1.2,0,0], uSize: [2,4],
            uRadius: [0,0.2], uOrientation: quat.IDENTITY,
            uForce: [2,5], uTarget: vec3.ZERO, uGravity: vec3.ZERO,
            uRotation: [0, 2 * Math.PI], uAngular: [-Math.PI,Math.PI,0,0]
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        SharedSystem.particles.dust.remove(this.dust)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.shadow = this.context.get(DecalPass).create(4)
        this.shadow.transform = this.context.get(TransformSystem).create()
        this.shadow.transform.parent = this.mesh.transform
        this.shadow.material = new DecalMaterial()
        this.shadow.material.program = this.context.get(DecalPass).program
        this.shadow.material.diffuse = SharedSystem.textures.glow

        this.context.get(TerrainSystem).tilePosition(path[path.length - 1][0], path[path.length - 1][1], this.dust.uniform.uniforms['uOrigin'] as any)
        vec3.copy(this.dust.uniform.uniforms['uOrigin'] as any, this.dust.uniform.uniforms['uTarget'] as any)

        const animate = AnimationTimeline(this, {
            'shadow.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'shadow.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.6,1,0.4] }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,1,0], ease: ease.quartOut }
            ], BlendTween.vec3)
        })
        
        const floatDuration = 0.4
        const duration = path.length * floatDuration + 2 * floatDuration

        const dustEmit = EventTrigger([{ frame: duration - 0.1, value: 16 }], EventTrigger.emit)

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            dustEmit(elapsedTime, this.context.deltaTime, this.dust)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.shadow.transform)
        this.context.get(DecalPass).delete(this.shadow)
    }
    public *strike(target: vec2): Generator<ActionSignal> {
        target = vec2.add([0,1], this.tile, vec2())
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
            'mesh.armature': modelAnimations[Isopod.model].activate,

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
                orb.place(this.tile[0], this.tile[1] + 1)
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