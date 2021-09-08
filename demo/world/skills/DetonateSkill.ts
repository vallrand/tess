import { Application } from '../../engine/framework'
import { ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { GL, ShaderProgram } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { Decal, DecalPass, ParticleEffectPass, PointLight, PointLightPass } from '../../engine/pipeline'
import { DecalMaterial, EffectMaterial, MaterialSystem, ShaderMaterial, SpriteMaterial } from '../../engine/materials'
import { BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { AnimationTimeline, EmitterTrigger, PropertyAnimation, EventTrigger, TransformSystem } from '../../engine/scene'
import { _ActionSignal } from '../Actor'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube } from '../player'
import { SharedSystem } from '../shared'
import { CubeSkill } from './CubeSkill'
import { Minefield, LandMine } from './Minefield'

const actionTimeline = {
    'dust': EmitterTrigger({ frame: 1.0, value: 48 }),
    'light.radius': PropertyAnimation([
        { frame: 1, value: 0 },
        { frame: 1.5, value: 8, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 1, value: 8 },
        { frame: 1.5, value: 0, ease: ease.quadOut }
    ], lerp),
    'stamp.transform.scale': PropertyAnimation([
        { frame: 1, value: [10,4,10] }
    ], vec3.lerp),
    'stamp.threshold': PropertyAnimation([
        { frame: 0.9, value: 2.5 },
        { frame: 1.3, value: 0, ease: ease.quadOut },
        { frame: 2, value: -2.5, ease: ease.sineIn }
    ], lerp),
    'tube.transform.scale': PropertyAnimation([
        { frame: 0, value: [0,2,0] },
        { frame: 1.2, value: [2.6,7,2.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'tube.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quartIn }
    ], vec4.lerp),
    'chargeX.transform.scale': PropertyAnimation([
        { frame: 0, value: [12,2,2] }
    ], vec3.lerp),
    'chargeY.transform.scale': PropertyAnimation([
        { frame: 0, value: [12,2,2] }
    ], vec3.lerp),
    'chargeX.threshold': PropertyAnimation([
        { frame: 0, value: 3 },
        { frame: 0.7, value: 0, ease: ease.sineIn },
        { frame: 1.4, value: -3, ease: ease.sineOut }
    ], lerp),
    'chargeY.threshold': PropertyAnimation([
        { frame: 0, value: 3 },
        { frame: 0.7, value: 0, ease: ease.sineIn },
        { frame: 1.4, value: -3, ease: ease.sineOut }
    ], lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.9, value: [2,7,1], ease: ease.sineIn }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.9, value: [1,0.5,0.6,0] },
        { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
}

export class DetonateSkill extends CubeSkill {
    private dust: ParticleEmitter
    private light: PointLight
    private stamp: Decal
    private tube: BatchMesh
    private stampMaterial: DecalMaterial
    private chargeX: Decal
    private chargeY: Decal
    private chargeMaterial: DecalMaterial
    private beam: Sprite
    private minefield: Minefield = new Minefield(this.context)
    constructor(context: Application, cube: Cube){
        super(context, cube)
        const materials = context.get(MaterialSystem)

        this.stampMaterial = new DecalMaterial()
        this.stampMaterial.blendMode = null
        this.stampMaterial.program = ShaderProgram(this.context.gl, shaders.decal_vert, shaders.decal_frag, {
            INSTANCED: true, ALPHA_CUTOFF: 0.01, NORMAL_MAPPING: true, MASK: true
        })
        this.stampMaterial.program.uniforms['uLayer'] = 1
        this.stampMaterial.program.uniforms['uDissolveEdge'] = 0.1
        this.stampMaterial.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(512, 512, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/stamp_frag.glsl'), {
            }), {}, 0
        ).target
        this.stampMaterial.normal = materials.addRenderTexture(
            materials.createRenderTexture(512, 512, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/stamp_frag.glsl'), {
                NORMAL_MAP: true
            }), {}, 0
        ).target

        this.tube = new BatchMesh(SharedSystem.geometry.cylinder)
        this.tube.material = new EffectMaterial(this.context.gl, {
            PANNING: true, GREYSCALE: true, GRADIENT: true, VERTICAL_MASK: true
        }, {
            uUVTransform: vec4(0,0,3,2),
            uUVPanning: vec2(-0.4,-0.8),
            uColorAdjustment: vec3(1,1,0),
            uUV2Transform: vec4(0,0.04,2,2),
            uUV2Panning: vec2(0.4,-0.8),
            uVerticalMask: vec4(0.0,0.5,0.8,1.0),
        })
        this.tube.material['gradient'] = GradientRamp(this.context.gl, [
            0xffffffff, 0xebdadad0, 0xd18a9790, 0x94063ca0, 0x512e3c70, 0x29202330, 0x00000000, 0x00000000
        ], 1)
        this.tube.material.diffuse = SharedSystem.textures.boxStripes

        this.chargeMaterial = new DecalMaterial()
        this.chargeMaterial.program = ShaderProgram(this.context.gl, shaders.decal_vert, require('../shaders/charger_frag.glsl'), {
            INSTANCED: true
        })
        this.chargeMaterial.program.uniforms['uLayer'] = this.chargeMaterial.layer
        this.chargeMaterial.program.uniforms['uDissolveEdge'] = 1

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        vec2.set(0,0.5,this.beam.origin)
    }
    public *activate(transform: mat4, orientation: quat): Generator<_ActionSignal> {
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const origin: vec3 = mat4.transform([0, 0, 0], this.cube.transform.matrix, vec3())

        this.tube.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,3,0], this.tube.transform.position)
        this.context.get(ParticleEffectPass).add(this.tube)

        this.stamp = this.context.get(DecalPass).create(0)
        this.stamp.material = this.stampMaterial
        this.stamp.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.stamp.transform.position)

        this.chargeX = this.context.get(DecalPass).create(0)
        this.chargeX.material = this.chargeMaterial
        this.chargeX.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.chargeX.transform.position)

        this.chargeY = this.context.get(DecalPass).create(0)
        this.chargeY.material = this.chargeMaterial
        this.chargeY.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.chargeY.transform.position)
        quat.axisAngle(vec3.AXIS_Y, 0.5 * Math.PI, this.chargeY.transform.rotation)

        this.beam.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.beam.transform.position)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,2,0], this.light.transform.position)
        vec3.set(1,0,0.2,this.light.color)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: origin, uOrientation: quat.IDENTITY,
            uLifespan: [0.5,1,0,0], uSize: [3,6],
            uRadius: [0.5,1], uForce: [6,12], uTarget: origin,
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2*Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0]
        })

        const animate = AnimationTimeline(this, {
            ...actionTimeline
        })
        const mine = this.minefield.create()

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)
            if(elapsedTime >= 1 && !mine.enabled)
                mine.place(this.cube.state.tile[0], this.cube.state.tile[1])

            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.chargeX.transform)
        this.context.get(TransformSystem).delete(this.chargeY.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.stamp.transform)
        this.context.get(TransformSystem).delete(this.tube.transform)

        this.context.get(DecalPass).delete(this.chargeX)
        this.context.get(DecalPass).delete(this.chargeY)
        this.context.get(DecalPass).delete(this.stamp)

        SharedSystem.particles.dust.remove(this.dust)
        this.context.get(PointLightPass).delete(this.light)

        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.tube)
    }
}