import { createCylinder, createSphere, applyTransform } from '../../engine/geometry'
import { clamp, ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { Mesh, MeshSystem } from '../../engine/Mesh'
import { Material } from '../../engine/Material'
import { ShaderProgram } from '../../engine/webgl'
import { PointLight, PointLightPass } from '../../engine/deferred/PointLightPass'
import { shaders } from '../../engine/shaders'
import { TransformSystem } from '../../engine/Transform'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { SpriteMaterial } from '../../engine/Sprite'
import { ParticleEmitter } from '../../engine/particles'
import { BatchMesh, BillboardType, Line, Sprite } from '../../engine/batch'
import { animations } from '../animations'
import { PropertyAnimation, EmitterTrigger, AnimationTimeline } from '../animations/timeline'
import { SharedSystem } from '../shared'
import { ActionSignal } from '../Actor'
import { Cube, cubeModules } from '../player'

const timelineTracks = {
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
        { frame: 0, value: [2,2,0] },
        { frame: 1.0, value: vec3.ONE, ease: ease.quadOut },
        { frame: 1.5, value: [0,0,2], ease: ease.cubicIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: [0,0,0,0] },
        { frame: 1.2, value: [1,1,1,1], ease: ease.quadOut },
        { frame: 1.4, value: [1,1,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [2,2,2] },
        { frame: 1.1, value: [4,4,4], ease: ease.sineOut },
        { frame: 1.4, value: [0,0,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0,0,0,0] },
        { frame: 1.1, value: [0.1,0.5,0.6,0.5], ease: ease.quadOut },
        { frame: 1.4, value: [0.5,1,1,0], ease: ease.sineIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
            { frame: 1.3, value: [0,0,0] },
            { frame: 1.8, value: [5,5,5], ease: ease.cubicOut }
        ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 1.3, value: [0.7,1,1,0.1] },
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
}

export class BeamSkill {
    private readonly cone: BatchMesh
    private readonly beam: Line
    private energy: ParticleEmitter
    private sparks: ParticleEmitter
    private light: PointLight
    private readonly center: Sprite
    private readonly flash: Sprite
    private readonly ring: Sprite
    private readonly direction: vec3 = vec3()
    constructor(private readonly context: Application, private readonly cube: Cube){
        const cylinder = createCylinder({
            radiusTop: 0, radiusBottom: 6, height: 3,
            horizontal: 4, radial: 16,
            cap: false, angleStart: 0, angleLength: 2 * Math.PI
        })
        applyTransform(cylinder, mat4.fromRotationTranslationScale(
            quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, quat()), vec3(0,0,-1.5), vec3.ONE, mat4()))
        this.cone = new BatchMesh(cylinder, true)
        this.cone.material = new SpriteMaterial()
        this.cone.material.program = ShaderProgram(this.context.gl, shaders.batch_vert, require('../shaders/converge_frag.glsl'))
        this.cone.material.texture = SharedSystem.textures.directionalNoise

        this.center = new Sprite()
        this.center.billboard = BillboardType.Sphere
        this.center.material = new SpriteMaterial()
        this.center.material.program = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'), { RADIAL: true })

        this.beam = new Line()
        this.beam.path = [vec3(), vec3()]
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'))

        const ringMaterial = new SpriteMaterial()
        ringMaterial.texture = SharedSystem.textures.ring
        vec2.set(2, 2, ringMaterial.size)

        const raysMaterial = new SpriteMaterial()
        raysMaterial.texture = SharedSystem.textures.rays
        vec2.set(2, 2, raysMaterial.size)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.Sphere
        this.ring.material = ringMaterial

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.Sphere
        this.flash.material = raysMaterial
    }
    public *activate(origin: vec3, target: vec3): Generator<ActionSignal> {
        const particleEffects = this.context.get(ParticleEffectPass)
        vec3.subtract(target, origin, this.direction)

        this.cone.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.cone.transform.position)
        quat.rotationTo([0,0,-1], this.direction, this.cone.transform.rotation)

        this.center.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.center.transform.position)

        this.flash.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.flash.transform.position)

        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.ring.transform.position)

        vec3.copy(origin, this.beam.path[0])

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.light.transform.position)
        vec3.set(0.5,1,1, this.light.color)

        particleEffects.add(this.cone, this.ring, this.flash, this.beam, this.center)

        this.energy = SharedSystem.particles.energy.add({
            uLifespan: [1,1.8,0,0],
            uOrigin: origin,
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: [0.4,0.8],
            uRadius: [8,12],
            uForce: vec2.ZERO,
            uTarget: origin
        })

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.5,1,-0.2,0],
            uOrigin: origin,
            uLength: [0.2,0.4],
            uGravity: [0,-9.8,0],
            uSize: [0.1,0.4],
            uRadius: [0.2,0.5],
            uForce: [4,10],
            uTarget: origin
        })

        const mesh = this.cube.meshes[this.cube.state.side]
        const moduleSettings = cubeModules[this.cube.state.sides[this.cube.state.side].type]

        const animate = AnimationTimeline(this, {
            ...timelineTracks,
            'beam.path.1': PropertyAnimation([
                { frame: 1.3, value: origin },
                { frame: 1.6, value: target, ease: ease.cubicOut }
            ], vec3.lerp),
            'energy': EmitterTrigger({ frame: 0, value: 128, origin, target: origin }) as any,
            'sparks': EmitterTrigger({ frame: 1.2, value: 32, origin, target: vec3.add(origin, [0,-0.4,0], vec3()) }) as any
        })

        for(let duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            animations[moduleSettings.model].activate(elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.energy.remove(this.energy)
        SharedSystem.particles.sparks.remove(this.sparks)
        particleEffects.remove(this.cone, this.ring, this.flash, this.beam, this.center)

        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.center.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(PointLightPass).delete(this.light)
        return
    }
}