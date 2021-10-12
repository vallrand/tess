import { mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, EffectMaterial, ShaderMaterial, SpriteMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube } from '../player'
import { CubeSkill } from './CubeSkill'

const introTimeline = {
    'dust': EventTrigger([
        { frame: 0.85, value: 36 }
    ], EventTrigger.emit),
    'shield.transform.scale': PropertyAnimation([
        { frame: 1, value: vec3.ZERO },
        { frame: 3, value: [3,5,3], ease: ease.elasticOut(1,0.75) }
    ], vec3.lerp),
    'shield.color': PropertyAnimation([
        { frame: 1, value: [1,0,0.5,0] },
        { frame: 2.5, value: vec4.ONE, ease: ease.cubicOut }
    ], vec4.lerp),
    'displacement.transform.scale': PropertyAnimation([
        { frame: 1.0, value: vec3.ZERO },
        { frame: 2.5, value: [3,5,3], ease: ease.elasticOut(1,0.75) }
    ], vec3.lerp),
    'displacement.color': PropertyAnimation([
        { frame: 1, value: [1,0.2,0.8,1] },
        { frame: 2, value: [1,1,1,0.1], ease: ease.quadOut }
    ], vec4.lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [0,2,0] },
        { frame: 1.4, value: [12,2,12], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,1,0.9,0] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 2.0, value: [1.4,4.2,1.4], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.8, value: [1,0.4,0.8,1.0] },
        { frame: 1.4, value: [0.5,1,1,0], ease: ease.sineIn },
        { frame: 2.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'tube.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [1,3,1] },
        { frame: 1.0, value: [2.4,3.6,2.4], ease: ease.quadOut },
        { frame: 1.4, value: [5,2,5], ease: ease.sineIn }
    ], vec3.lerp),
    'tube.transform.position': PropertyAnimation([
        { frame: 0.2, value: [0,0,0] },
        { frame: 1.2, value: [0,4,0], ease: ease.sineOut }
    ], vec3.lerp),
    'tube.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.4, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'sphere.transform.rotation': PropertyAnimation([
        { frame: 0, value: quat.axisAngle(vec3.AXIS_X, Math.PI, quat()) }
    ], quat.slerp),
    'sphere.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.2, value: [4,6,4], ease: ease.cubicOut },
        { frame: 2.2, value: [3,5,3], ease: ease.quadInOut }
    ], vec3.lerp),
    'sphere.color': PropertyAnimation([
        { frame: 1.2, value: vec4.ONE },
        { frame: 2.2, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp)
}
const outroTimeline = {
    'shield.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [3,5,3] },
        { frame: 1.0, value: vec3.ZERO, ease: ease.CubicBezier(0.36, 0, 0.66, -0.56) }
    ], vec3.lerp),
    'shield.color': PropertyAnimation([
        { frame: 0.2, value: vec4.ONE },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'displacement.color': PropertyAnimation([
        { frame: 0, value: [1,1,1,0.1] },
        { frame: 0.4, value: [1,0.6,0.9,1], ease: ease.quadOut },
        { frame: 0.8, value: [1,1,1,0], ease: ease.sineIn }
    ], vec4.lerp)
}

export class ShieldSkill extends CubeSkill {
    public active: boolean = false
    private idleIndex: number = -1

    private shield: Mesh
    private displacement: Mesh
    private tube: BatchMesh
    private wave: Decal
    private dust: ParticleEmitter
    private beam: Sprite
    private sphere: BatchMesh
    private waveMaterial: DecalMaterial
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.waveMaterial = new DecalMaterial()
        this.waveMaterial.program = this.context.get(DecalPass).program
        this.waveMaterial.diffuse = SharedSystem.textures.ring

        this.shield = new Mesh()
        this.shield.order = 1
        this.shield.buffer = SharedSystem.geometry.sphereMesh
        this.shield.material = SharedSystem.materials.shieldMaterial

        this.displacement = new Mesh()
        this.displacement.order = 0
        this.displacement.buffer = SharedSystem.geometry.sphereMesh
        this.displacement.material = SharedSystem.materials.shieldDisplacementMaterial

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.beam.origin)
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam

        this.tube = new BatchMesh(SharedSystem.geometry.cylinder)
        this.tube.material = SharedSystem.materials.stripesMaterial

        this.sphere = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        this.sphere.material = this.tube.material
    }
    public *open(): Generator<ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        const origin: vec3 = mat4.transform([0, 0, 0], this.cube.transform.matrix, vec3())

        this.wave = this.context.get(DecalPass).create(0)
        this.wave.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.wave.transform.position)
        this.wave.material = this.waveMaterial

        this.beam.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,4,0], this.beam.transform.position)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.tube.transform = this.context.get(TransformSystem).create()
        this.tube.transform.parent = this.cube.transform
        this.context.get(ParticleEffectPass).add(this.tube)

        this.sphere.transform = this.context.get(TransformSystem).create()
        this.sphere.transform.parent = this.cube.transform
        this.context.get(ParticleEffectPass).add(this.sphere)

        this.displacement.transform = this.context.get(TransformSystem).create()
        this.displacement.transform.parent = this.cube.transform
        this.context.get(PostEffectPass).add(this.displacement)

        this.shield.transform = this.context.get(TransformSystem).create()
        this.shield.transform.parent = this.cube.transform
        this.context.get(PostEffectPass).add(this.shield)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: origin,
            uLifespan: [0.6,1.0,-0.1,0],
            uSize: [2,5],
            uRadius: [0.5,0.8],
            uOrientation: quat.IDENTITY,
            uForce: [6,12],
            uTarget: origin,
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2*Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0],
        })

        const animate = AnimationTimeline(this, introTimeline)

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            if(elapsedTime <= 1) armatureAnimation.open(elapsedTime, mesh.armature)
            else if(this.idleIndex == -1) this.idleIndex = this.context.get(AnimationSystem).start(this.idle(), true)

            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        state.open = 1

        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.tube.transform)
        this.context.get(TransformSystem).delete(this.sphere.transform)

        SharedSystem.particles.dust.remove(this.dust)

        this.context.get(ParticleEffectPass).remove(this.sphere)
        this.context.get(ParticleEffectPass).remove(this.tube)
        this.context.get(ParticleEffectPass).remove(this.beam)

        this.context.get(DecalPass).delete(this.wave)
    }
    public *close(): Generator<ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        const waiter = this.context.get(AnimationSystem).await(this.idleIndex)
        this.idleIndex = -1
        while(!waiter.continue) yield ActionSignal.WaitNextFrame

        const animate = AnimationTimeline(this, outroTimeline)
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            armatureAnimation.open(1.0 - elapsedTime, mesh.armature)
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        state.open = 0

        this.context.get(TransformSystem).delete(this.shield.transform)
        this.context.get(TransformSystem).delete(this.displacement.transform)

        this.context.get(PostEffectPass).remove(this.shield)
        this.context.get(PostEffectPass).remove(this.displacement)
    }
    public *idle(): Generator<ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        const velocityEase = (v0: number, v1: number, duration: number): ease.IEase => {
            const acceleration = (v1 - v0) / duration
            const distance = duration * (v0 + 0.5 * (v1 - v0))
            return x => x <= duration
            ? v0 * x + x*x*0.5 * acceleration
            : v1 * x + distance
        }
        velocityEase.duration = (v0: number, v1: number, distance: number): number => 
        distance / (v0 + 0.5 * (v1 - v0))
        const accelerationEase = velocityEase(0, 1, 0.5)

        let head: number = 0
        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            head = accelerationEase(elapsedTime) % 1.0
            armatureAnimation.loop(head, mesh.armature)
            if(this.idleIndex == -1) break
            yield ActionSignal.WaitNextFrame
        }
        const decelerationDistance = .25 - head % .25
        const decelerationDuration = velocityEase.duration(1, 0, decelerationDistance)
        const decelerationEase = velocityEase(1, 0, decelerationDuration)
        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            armatureAnimation.loop((head + decelerationEase(elapsedTime)) % 1, mesh.armature)
            if(elapsedTime > decelerationDuration) break
            yield ActionSignal.WaitNextFrame
        }
    }
}