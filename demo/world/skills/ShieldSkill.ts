import { Application } from '../../engine/framework'
import { Mesh } from '../../engine/Mesh'
import { ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { _ActionSignal } from '../Actor'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube } from '../player'
import { CubeSkill } from './CubeSkill'
import { SharedSystem } from '../shared'
import { ShaderMaterial } from '../../engine/Material'
import { GL, ShaderProgram } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { TransformSystem } from '../../engine/scene'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger, AnimationSystem, ActionSignal } from '../../engine/scene/Animation'
import { ParticleEffectPass } from '../../engine/pipeline/ParticleEffectPass'
import { Decal, DecalPass } from '../../engine/pipeline/DecalPass'
import { Sprite, BillboardType, SpriteMaterial } from '../../engine/batch'
import { PostEffectPass } from '../../engine/pipeline/PostEffectPass'
import { ParticleEmitter } from '../../engine/particles'
import { PointLight, PointLightPass } from '../../engine/pipeline/PointLightPass'

const timelineTracks = {
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
        { frame: 1.8, value: [1.4,4.2,1.4], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.8, value: [1,0.4,0.8,1.0] },
        { frame: 1.4, value: [0.5,1,1,0], ease: ease.sineIn },
        { frame: 1.8, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 8 }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 1.2, value: 0 },
        { frame: 1.8, value: 6, ease: ease.quadOut},
        { frame: 2.4, value: 0, ease: ease.sineOut }
    ], lerp),
    'light.color': PropertyAnimation([
        { frame: 1.0, value: [1,0.5,0.8] },
        { frame: 2.4, value: [0.5,1,1], ease: ease.sineIn }
    ], vec3.lerp),
}

export class ShieldSkill extends CubeSkill {
    public active: boolean = false
    private idleIndex: number = -1

    private shield: Mesh
    private displacement: Mesh
    private wave: Decal
    private dust: ParticleEmitter
    private beam: Sprite
    private light: PointLight
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.shield = new Mesh()
        this.shield.buffer = SharedSystem.geometry.sphereMesh
        const shieldMaterial = this.shield.material = new ShaderMaterial()
        shieldMaterial.program = ShaderProgram(this.context.gl, shaders.geometry_vert, require('../shaders/shield_frag.glsl'), {})
        shieldMaterial.cullFace = GL.NONE
        shieldMaterial.blend = ShaderMaterial.ADD

        this.displacement = new Mesh()
        this.displacement.buffer = SharedSystem.geometry.sphereMesh
        const displacementMaterial = this.displacement.material = new ShaderMaterial()
        //TODO add property to blit screen
        displacementMaterial.program = ShaderProgram(this.context.gl, shaders.geometry_vert, require('../shaders/shield_frag.glsl'), { DISPLACEMENT: true })
    }
    public *open(): Generator<_ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        const origin: vec3 = mat4.transform([0, 0, 0], this.cube.transform.matrix, vec3())

        this.wave = this.context.get(DecalPass).create(0)
        this.wave.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.wave.transform.position)
        this.wave.material = new SpriteMaterial()
        this.wave.material.program = this.context.get(ParticleEffectPass).program
        this.wave.material.diffuse = SharedSystem.textures.ring

        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.beam.origin)
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,4,0], this.beam.transform.position)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.displacement.transform = this.context.get(TransformSystem).create()
        this.displacement.transform.parent = this.cube.transform
        this.context.get(PostEffectPass).add(this.displacement as any)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        vec3.add(origin, [0,8,0], this.light.transform.position)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: origin,
            uLifespan: [0.6,1.0,-0.1,0],
            uSize: [2,5],
            uRadius: [0.5,0.8],
            uForce: [6,12],
            uTarget: origin,
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2*Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0],
        })

        this.shield.transform = this.context.get(TransformSystem).create()
        this.shield.transform.parent = this.cube.transform
        this.context.get(ParticleEffectPass).add(this.shield)

        const animate = AnimationTimeline(this, {
            ...timelineTracks,
            'dust': EmitterTrigger({ frame: 0.85, value: 36 })
        })

        for(let duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            if(elapsedTime <= 1) armatureAnimation.open(elapsedTime, mesh.armature)
            //else if(this.idleIndex == -1) this.idleIndex = this.context.get(AnimationSystem).start(this.idle())

            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) startTime = this.context.currentTime
            //if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }
        state.open = 1
    }
    public *idle(): Generator<ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            armatureAnimation.loop(elapsedTime % 1, mesh.armature)
            yield ActionSignal.WaitNextFrame
        }
    }
}