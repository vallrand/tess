import { Application } from '../../engine/framework'
import { ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { BillboardType, Mesh, Sprite } from '../../engine/components'
import { EffectMaterial, SpriteMaterial } from '../../engine/materials'
import { GL, ShaderProgram } from '../../engine/webgl'
import { GradientRamp } from '../../engine/particles'
import { shaders } from '../../engine/shaders'
import { ParticleEffectPass, PointLight, PointLightPass, PostEffectPass } from '../../engine/pipeline'
import { AnimationTimeline, PropertyAnimation, TransformSystem } from '../../engine/scene'
import { _ActionSignal } from '../Actor'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube, Direction, DirectionAngle } from '../player'
import { CubeSkill } from './CubeSkill'
import { SharedSystem } from '../shared'

const actionTimeline = {
    'bulge.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [3,3,3], ease: ease.quartOut }
    ], vec3.lerp),
    'bulge.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [4,4,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.material.uniform.uniforms.uDissolveThreshold': PropertyAnimation([
        { frame: 0.2, value: [0.2,0,0] },
        { frame: 0.5, value: [1,0,0], ease: ease.sineIn }
    ], vec3.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.1, value: [4,4,4], ease: ease.cubicIn },
        { frame: 0.3, value: vec3.ZERO, ease: ease.quadOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0, value: [1,1,0.8,0] },
        { frame: 0.3, value: [0.6,0.6,0,0], ease: ease.quadIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.5, value: 5, ease: ease.quartOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.1, value: 4, ease: ease.quadIn },
        { frame: 0.5, value: 0, ease: ease.cubicOut }
    ], lerp)
}

export class ProjectileSkill extends CubeSkill {
    private mesh: Mesh

    private bulge: Sprite
    private flash: Sprite
    private core: Sprite
    private light: PointLight
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.bulge = new Sprite()
        this.bulge.billboard = BillboardType.Sphere
        this.bulge.material = new SpriteMaterial()
        this.bulge.material.blendMode = null
        this.bulge.material.program = SharedSystem.materials.chromaticAberration
        this.bulge.material.diffuse = SharedSystem.textures.particle

        this.core = new Sprite()
        this.core.billboard = BillboardType.Sphere
        this.core.material = new SpriteMaterial()
        this.core.material.program = this.context.get(ParticleEffectPass).program
        this.core.material.diffuse = SharedSystem.textures.rays

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.None
        const flashMaterial = new EffectMaterial(this.context.gl, {
            POLAR: true, VERTICAL_MASK: true, PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true
        }, {
            uUVTransform: vec4(0.1,0,2,3.2),
            uUV2Transform: vec4(0.3,0,1.0,0.6),
            uColorAdjustment: vec2(1,0.6),
            uUVPanning: vec2(0,-0.8),
            uUV2Panning: vec2(0.1,-0.2),
            uVerticalMask: vec4(0.2,0.5,0.8,1.0),
            uDissolveColor: vec4(1,0,0,1),
            uDissolveThreshold: vec3(0.2,0,0)
        })
        flashMaterial.cullFace = GL.NONE
        flashMaterial.diffuse = SharedSystem.textures.cellularNoise
        flashMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffff00, 0xffffff00, 0xfffcd600, 0xf0eba800, 0xc2bd7430, 0xa60f5050, 0x00000000,
        ], 1)
        this.flash.material = flashMaterial

        //small fast yellow particles?
    }
    public *activate(transform: mat4, orientation: quat, direction: Direction): Generator<_ActionSignal> {
        const mesh = this.mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const origin = vec3(-1.2,1.8,0)
        quat.transform(origin, DirectionAngle[direction], origin)
        mat4.transform(origin, this.cube.transform.matrix, origin)
        //ROTATE

        const parentTransform = this.context.get(TransformSystem).create()
        quat.copy(DirectionAngle[(direction + 3) % 4], parentTransform.rotation)
        vec3.copy(origin, parentTransform.position)

        this.bulge.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.bulge.transform.position)
        this.context.get(PostEffectPass).add(this.bulge)

        this.core.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.core.transform.position)
        this.context.get(ParticleEffectPass).add(this.core)

        this.flash.transform = this.context.get(TransformSystem).create()
        this.flash.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.flash)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = parentTransform
        vec3.set(1, 0.9, 0.5, this.light.color)

        const animate = AnimationTimeline(this, {
            ...actionTimeline
            // 'mesh.armature.nodes.1.rotation': PropertyAnimation([
            //     { frame: 0, value: mesh.armature.nodes[1].rotation },
            //     { frame: 0.5, value: quat.axisAngle(vec3.AXIS_Y, 0 * 0.5 * Math.PI, quat()) }
            // ], quat.slerp)
        })

        // while(true)
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)
            armatureAnimation[`activate${direction}`](elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(parentTransform)
        this.context.get(TransformSystem).delete(this.bulge.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(PostEffectPass).remove(this.bulge)
    }
}