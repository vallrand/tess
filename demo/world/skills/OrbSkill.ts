import { ease, mat4, quat, vec2, vec3, vec4, mod, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { createCylinder, applyTransform, doubleSided, modifyGeometry } from '../../engine/geometry'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger, AnimationSystem, ActionSignal } from '../../engine/scene/Animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { Sprite, BillboardType, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, EffectMaterial, ShaderMaterial, SpriteMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { shaders } from '../../engine/shaders'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { _ActionSignal } from '../Actor'
import { Cube, Direction, DirectionAngle } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

const actionTimeline = {
    'cone.transform.scale': PropertyAnimation([
        { frame: 0, value: [0.2,0.2,1] },
        { frame: 0.6, value: vec3.ONE, ease: ease.sineOut },
        { frame: 0.8, value: [0,0,2], ease: ease.quartIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.6, value: vec4.ONE, ease: ease.quadOut },
        { frame: 0.8, value: [1,0,1,0], ease: ease.cubicIn }
    ], vec4.lerp),
    'glow.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-3] }
    ], vec3.lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 0.5, value: vec3.ZERO },
        { frame: 0.8, value: [10,10,10], ease: ease.quartOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 0.5, value: [0.7,1,0.9,0] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [6,6,6], ease: ease.quadIn },
        { frame: 1.6, value: [12,12,12], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-1] },
        { frame: 1.6, value: [0,0,-3], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0, value: [0,0,0,1] },
        { frame: 0.8, value: [0,0,-1,0], ease: ease.quadIn },
        { frame: 1.6, value: [0,0,0,-1], ease: ease.quadOut }
    ], quat.slerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,1,0.9,0] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),
    'sphere.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-2] },
        { frame: 0.7, value: [0,0,-2.8], ease: ease.quadInOut }
    ], vec3.lerp),
    'sphere.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [2,2,2], ease: ease.quadIn },
        { frame: 1.0, value: [0,3,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.transform.scale': PropertyAnimation([
        { frame: 0.7, value: [16,16,16] },
        { frame: 0.9, value: vec3.ZERO, ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.color': PropertyAnimation([
        { frame: 0.7, value: vec4.ZERO },
        { frame: 0.9, value: [1,1,0.5,0.5], ease: ease.sineOut }
    ], vec4.lerp)
}

class CorrosiveOrb {
    orb: BatchMesh
    aura: Sprite
    readonly tile: vec2 = vec2()
    constructor(private readonly context: Application, private readonly parent: OrbSkill){

    }
    public get enabled(): boolean { return !!this.orb }
    public place(column: number, row: number, origin: vec3): void {
        const transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, transform.position)
        vec2.set(column, row, this.tile)
        transform.position[1] += 1

        this.orb = new BatchMesh(SharedSystem.geometry.lowPolySphere)
        this.orb.order = 2
        const orbMaterial = new SpriteMaterial()
        orbMaterial.program = ShaderProgram(this.context.gl, shaders.batch_vert, require('../shaders/orb_frag.glsl'), {

        })
        orbMaterial.blendMode = null
        this.orb.material = orbMaterial
        this.orb.transform = this.context.get(TransformSystem).create()
        this.orb.transform.parent = transform
        this.context.get(ParticleEffectPass).add(this.orb)

        this.aura = new Sprite()
        this.aura.order = 4
        this.aura.billboard = BillboardType.Sphere
        const auraMaterial = new EffectMaterial(this.context.gl, {
            VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true, POLAR: true, SKEW: true
        }, {
            uUVTransform: vec4(0,0,1,0.8),
            uVerticalMask: vec4(0.2,0.4,0.6,1),
            uUVPanning: vec2(0.2, -0.1),
            uUV2Transform: vec4(0,0,1,1.6),
            uUV2Panning: vec2(-0.2, -0.3),
            uColorAdjustment: vec3(1,0.9,0)
        })
        auraMaterial.diffuse = SharedSystem.textures.cellularNoise
        auraMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffff00, 0xdeffee00, 0x8ad4ad10, 0x68d4a820, 0x1aa17130, 0x075c4f20, 0x03303820, 0x00000000,
        ], 1)
        auraMaterial.depthTest = GL.NONE

        this.aura.material = auraMaterial
        this.aura.transform = this.context.get(TransformSystem).create()
        this.aura.transform.parent = transform
        vec3.set(4,4,4, this.aura.transform.scale)
        this.context.get(ParticleEffectPass).add(this.aura)

        this.context.get(AnimationSystem).start(this.idle(origin))
    }
    public kill(): void {
        
    }
    private *idle(origin: vec3): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'aura.transform.parent.position': PropertyAnimation([
                { frame: 0, value: origin },
                { frame: 1, value: vec3.copy(this.aura.transform.parent.position, vec3()), ease: ease.sineInOut }
            ], vec3.lerp),
            'aura.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [4,4,4], ease: ease.elasticOut(1,0.5) }
            ], vec3.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [1,1,1], ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp)
        })

        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        for(const startTime = this.context.currentTime; true;){

            

            yield ActionSignal.WaitNextFrame
        }
    }
}

export class OrbSkill extends CubeSkill {
    private cone: BatchMesh
    private glow: Sprite
    private ring: Sprite
    private sphere: BatchMesh
    private distortion: Sprite
    private particles: ParticleEmitter
    constructor(context: Application, cube: Cube){
        super(context, cube)

        const cone = createCylinder({
            radiusTop: 0.5, radiusBottom: 4, height: 4,
            horizontal: 8, radial: 8,
            cap: false, angleStart: 0, angleLength: 2 * Math.PI
        })
        const rotation = quat()
        modifyGeometry(cone, function verticalSkew(position: vec3, normal: vec3){
            const skewAngle = 1.6 * Math.PI * ease.circIn(0.5 + position[1] / 4)
            quat.axisAngle(vec3.AXIS_Y, skewAngle, rotation)
            quat.transform(position, rotation, position)
            quat.transform(normal, rotation, normal)
        })
        applyTransform(cone, mat4.fromRotationTranslationScale(
            quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, quat()), vec3(0,0,-2), vec3.ONE, mat4()))
        this.cone = new BatchMesh(doubleSided(cone))
        const coneMaterial = this.cone.material = new EffectMaterial(this.context.gl, {
            VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true
        }, {
            uUVTransform: vec4(0,0,2,0.2),
            uVerticalMask: vec4(0,0.5,0,0),
            uUVPanning: vec2(-0.2, -0.4),
            uUV2Transform: vec4(0,0,1,0.5),
            uUV2Panning: vec2(0.3, -0.7),
            uColorAdjustment: vec3(1,0.8,0)
        })
        coneMaterial.diffuse = SharedSystem.textures.cellularNoise
        coneMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffff00, 0xdeffee00, 0x8ad4ad10, 0x68d4a820, 0x1aa17130, 0x075c4f20, 0x03303820, 0x00000000,
        ], 1)


        this.glow = new Sprite()
        this.glow.order = -8
        this.glow.billboard = BillboardType.Sphere
        this.glow.material = new SpriteMaterial()
        this.glow.material.cullFace = GL.NONE
        this.glow.material.program = this.context.get(ParticleEffectPass).program
        this.glow.material.diffuse = SharedSystem.textures.sparkle

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.cullFace = GL.NONE
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl

        this.sphere = new BatchMesh(SharedSystem.geometry.lowPolySphere)
        this.sphere.material = coneMaterial

        this.distortion = new Sprite()
        this.distortion.billboard = BillboardType.None
        this.distortion.material = new SpriteMaterial()
        this.distortion.material.cullFace = GL.NONE
        this.distortion.material.blendMode = null
        this.distortion.material.program = SharedSystem.materials.chromaticAberration
        this.distortion.material.diffuse = SharedSystem.textures.wave
    }
    public *activate(transform: mat4, orientation: quat): Generator<_ActionSignal> {
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const origin = mat4.transform([0,1,0], this.cube.transform.matrix, vec3())
        const parentTransform = this.context.get(TransformSystem).create()
        vec3.copy(origin, parentTransform.position)
        quat.copy(DirectionAngle[mod(this.cube.state.direction + 3, 4)], parentTransform.rotation)
        const target = quat.transform([0,1,-3], parentTransform.rotation, vec3())
        mat4.transform(target, this.cube.transform.matrix, target)

        this.cone.transform = this.context.get(TransformSystem).create()
        this.cone.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.cone)

        this.sphere.transform = this.context.get(TransformSystem).create()
        this.sphere.transform.parent = parentTransform
        quat.axisAngle(vec3.AXIS_X, 0.5*Math.PI, this.sphere.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.sphere)

        this.glow.transform = this.context.get(TransformSystem).create()
        this.glow.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.glow)

        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.ring)

        this.distortion.transform = this.context.get(TransformSystem).create()
        this.distortion.transform.parent = parentTransform
        vec3.set(0,0,-2, this.distortion.transform.position)
        this.context.get(PostEffectPass).add(this.distortion)

        const particleTarget = quat.transform([0,-0.2,0.5], parentTransform.rotation, vec3())
        vec3.add(origin, particleTarget, particleTarget)

        this.particles = SharedSystem.particles.sparks.add({
            uLifespan: [0.5,0.8,-0.5,0],
            uOrigin: origin,
            uLength: [0.2,0.5],
            uGravity: quat.transform([0,0,10], parentTransform.rotation, vec3()),
            uSize: [0.2,0.8],
            uRadius: [0,0.5],
            uForce: [6,10],
            uTarget: particleTarget
        })

        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'particles': EmitterTrigger({ frame: 0.2, value: 48 }),
        })

        const orb = new CorrosiveOrb(this.context, this)
        const tile: vec2 = [vec2(0,-2),vec2(-2,0),vec2(0,2),vec2(2,0)][this.direction]
        vec2.add(this.cube.state.tile, tile, tile)

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > 0.7 && !orb.enabled) orb.place(tile[0], tile[1], target)

            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(parentTransform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.sphere.transform)
        this.context.get(TransformSystem).delete(this.distortion.transform)

        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.sphere)
        this.context.get(PostEffectPass).remove(this.distortion)

        SharedSystem.particles.bolts.remove(this.particles)
    }
}