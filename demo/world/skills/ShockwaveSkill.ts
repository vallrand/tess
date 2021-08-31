import { ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { TransformSystem, AnimationTimeline, PropertyAnimation } from '../../engine/scene'
import { Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { MaterialSystem, SpriteMaterial } from '../../engine/materials'
import { PointLight, PointLightPass, ParticleEffectPass, PostEffectPass, Decal, DecalPass } from '../../engine/pipeline'
import { ParticleEmitter } from '../../engine/particles'
import { shaders } from '../../engine/shaders'

import { _ActionSignal } from '../Actor'
import { modelAnimations, CubeModuleModel } from '../animations'
import { Cube } from '../player'
import { SharedSystem } from '../shared'
import { CubeSkill } from './CubeSkill'

const actionTimeline = {
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [16,2,16] },
        { frame: 0.6, value: [0,2,0], ease: ease.quadIn }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.6, value: [0.8,0.3,0.6,0.4], ease: ease.quadOut }
    ], vec4.lerp),
    'crack.transform.scale': PropertyAnimation([
        { frame: 0, value: [16,2,16] }
    ], vec3.lerp),
    'crack.threshold': PropertyAnimation([
        { frame: 0.7, value: 2.5 },
        { frame: 1.2, value: 0, ease: ease.cubicOut },
        { frame: 2, value: -2.5, ease: ease.sineOut }
    ], lerp),
    'crack.color': PropertyAnimation([
        { frame: 1.0, value: vec4.ONE },
        { frame: 1.6, value: [0,0,0,1], ease: ease.sineOut }
    ], vec4.lerp),
    'bolts.rate': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.8, value: 0.004, ease: ease.stepped },
        { frame: 1.8, value: 0, ease: ease.stepped }
    ], lerp),
    'bolts.uniform.uniforms.uRadius': PropertyAnimation([
        { frame: 0.8, value: vec2.ONE },
        { frame: 1.8, value: [6,7], ease: ease.sineOut }
    ], vec2.lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0.7, value: [0,0,0] },
        { frame: 1.2, value: [20,20,20], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0.8, value: vec4.ONE },
        { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.2, value: 12, ease: ease.cubicOut },
        { frame: 2, value: 0, ease: ease.cubicIn }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.6, value: 0 },
        { frame: 0.8, value: 4, ease: ease.cubicIn },
        { frame: 1.4, value: 0.5, ease: ease.cubicOut },
        { frame: 2, value: 0, ease: ease.sineIn }
    ], lerp),
    'light.color': PropertyAnimation([
        { frame: 0.8, value: [0.5,0.8,1] },
        { frame: 1.4, value: [1,0.2,0.6], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0.6, value: vec3.ZERO },
        { frame: 1.0, value: [6,6,6], ease: ease.quartOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.6, value: [0.6,0.8,1.0,0] },
        { frame: 1.0, value: [0,0,0,0], ease: ease.quadIn }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [0,2,1] },
        { frame: 1.2, value: [1.4,4.8,1], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.6, value: [1,0.6,0.8,0] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cylinder.transform.scale': PropertyAnimation([
        { frame: 0, value: [8,2,8] },
        { frame: 0.5, value: [3,8,3], ease: ease.sineOut },
        { frame: 0.8, value: [6,1,6], ease: ease.cubicIn }
    ], vec3.lerp),
    'cylinder.transform.rotation': PropertyAnimation([
        { frame: 0, value: quat.IDENTITY },
        { frame: 0.5, value: quat.axisAngle(vec3.AXIS_Y, -1.0*Math.PI, quat()), ease: ease.quadIn },
        { frame: 0.8, value: quat.axisAngle(vec3.AXIS_Y, -1.5*Math.PI, quat()), ease: ease.quadOut }
    ], quat.slerp),
    'cylinder.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.5, value: [1,1,1,1], ease: ease.quadOut },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quartIn }
    ], vec4.lerp)
}

export class ShockwaveSkill extends CubeSkill {
    private ring: Decal
    private crack: Decal
    private light: PointLight
    private wave: Sprite
    private flash: Sprite
    private beam: Sprite
    private cylinder: BatchMesh

    private bolts: ParticleEmitter
    private shatterMaterial: SpriteMaterial
    constructor(context: Application, cube: Cube){
        super(context, cube)
        const materials = context.get(MaterialSystem)

        this.shatterMaterial = new SpriteMaterial()
        this.shatterMaterial.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(512, 512, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/shatter_frag.glsl'), {
            }), {}, 0
        ).target
        this.shatterMaterial.normal = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/shatter_frag.glsl'), {
                MASK: true
            }), {}, 0
        ).target

        this.wave = new Sprite()
        this.wave.billboard = BillboardType.None
        this.wave.material = new SpriteMaterial()
        this.wave.material.blendMode = null
        this.wave.material.program = SharedSystem.materials.distortion
        this.wave.material.diffuse = SharedSystem.textures.wave

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.None
        this.flash.material = new SpriteMaterial()
        this.flash.material.program = this.context.get(ParticleEffectPass).program
        this.flash.material.diffuse = SharedSystem.textures.wave

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        vec2.set(0,0.5,this.beam.origin)

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: [0,0,0],
            uRadius: [0,0],
            uLifespan: [0.1,0.8,0,0],
            uGravity: [0,0,0],
            uRotation: [0,2*Math.PI],
            uSize: [0.1,1.2],
            uFrame: [8,4]
        })

        this.cylinder = new BatchMesh(SharedSystem.geometry.cylinder)
        this.cylinder.material = new SpriteMaterial()
        this.cylinder.material.program = this.context.get(ParticleEffectPass).program
        this.cylinder.material.diffuse = SharedSystem.textures.wind
    }
    public *activate(transform: mat4, orientation: quat): Generator<_ActionSignal> {
        const origin: vec3 = mat4.transform([0, 0, 0], transform, vec3() as any) as any

        this.ring = this.context.get(DecalPass).create(0)
        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.ring.transform.position)
        this.ring.material = new SpriteMaterial()
        this.ring.material.diffuse = SharedSystem.textures.raysRing

        this.crack = this.context.get(DecalPass).create(1)
        this.crack.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.crack.transform.position)
        this.crack.material = this.shatterMaterial

        this.wave.transform = this.context.get(TransformSystem).create()
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.wave.transform.rotation)
        vec3.add(origin, [0,1.5,0], this.wave.transform.position)
        this.context.get(PostEffectPass).add(this.wave)

        this.flash.transform = this.context.get(TransformSystem).create()
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.flash.transform.rotation)
        vec3.add(origin, [0,1.6,0], this.flash.transform.position)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.beam.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,3,0], this.beam.transform.position)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.cylinder.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,1,0], this.cylinder.transform.position)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,4,0], this.light.transform.position)

        vec3.add(origin, [0,2,0], this.bolts.uniform.uniforms['uOrigin'] as any)

        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const animate = AnimationTimeline(this, {
            ...actionTimeline
        })

        for(const duration = 2.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }


        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.crack.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)

        this.context.get(PointLightPass).delete(this.light)

        this.context.get(DecalPass).delete(this.ring)
        this.context.get(DecalPass).delete(this.crack)

        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.cylinder)

        //SharedSystem.particles.bolts.remove(this.bolts)
    }
}