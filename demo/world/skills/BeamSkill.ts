import { createCylinder, applyTransform, doubleSided } from '../../engine/geometry'
import { ease, lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { ShaderProgram } from '../../engine/webgl'
import { PointLight, PointLightPass, ParticleEffectPass } from '../../engine/pipeline'
import { shaders } from '../../engine/shaders'
import { SpriteMaterial, EffectMaterial } from '../../engine/materials'
import { TransformSystem, PropertyAnimation, EmitterTrigger, AnimationTimeline, ActionSignal } from '../../engine/scene'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, BatchMesh, Line } from '../../engine/components'
import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube } from '../player'
import { CubeSkill } from './CubeSkill'

const actionTimeline = {
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
        { frame: 0, value: [6,0,6] },
        { frame: 1.0, value: [3,3,3], ease: ease.quadOut },
        { frame: 1.5, value: [0,6,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: [0,0,0,0] },
        { frame: 1.2, value: [1,1,1,1], ease: ease.quadOut },
        { frame: 1.4, value: [1,1,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'cone.material.uniform.uniforms.uUVTransform.1': PropertyAnimation([
        { frame: 0.4, value: 0 },
        { frame: 1.5, value: -0xFF*0.0072, ease: ease.quartIn },
        { frame: 2.0, value: 0, ease: ease.stepped }
    ], lerp),
    'cone.material.uniform.uniforms.uUV2Transform.1': PropertyAnimation([
        { frame: 0.4, value: 0 },
        { frame: 1.5, value: -0xFF*0.0144, ease: ease.quartIn },
        { frame: 2.0, value: 0, ease: ease.stepped }
    ], lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: [4,4,4] },
        { frame: 1.1, value: [8,8,8], ease: ease.sineOut },
        { frame: 1.4, value: [0,0,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0,0,0,0] },
        { frame: 1.1, value: [0.1,0.5,0.6,0.5], ease: ease.quadOut },
        { frame: 1.4, value: [0.5,1,1,0], ease: ease.sineIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 1.3, value: [0,0,0] },
        { frame: 1.8, value: [10,10,10], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 1.3, value: [0.7,1,1,0] },
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

export class BeamSkill extends CubeSkill {
    private readonly cone: BatchMesh
    private readonly beam: Line
    private energy: ParticleEmitter
    private sparks: ParticleEmitter
    private smoke: ParticleEmitter
    private light: PointLight
    private readonly center: Sprite
    private readonly flash: Sprite
    private readonly ring: Sprite
    private readonly _direction: vec3 = vec3()
    constructor(context: Application, cube: Cube){
        super(context, cube)
        this.cone = new BatchMesh(SharedSystem.geometry.cone)
        this.cone.material = SharedSystem.materials.absorbTealMaterial

        const gradient = GradientRamp(this.context.gl, [
            0xf0fafa05,0xa7d9da0a,0x78b8bf19,0x6c9eae23,0x597c9628,0x4155771e,0x2b345814,0x1b20400a,0x0f112905,0x00000000
        ], 1)

        this.center = new Sprite()
        this.center.billboard = BillboardType.Sphere
        this.center.material = new SpriteMaterial()
        this.center.material.program = SharedSystem.materials.beamRadialProgram
        vec2.set(8, 4, this.center.material.uvTransform as any)
        this.center.material.diffuse = gradient

        this.beam = new Line()
        this.beam.path = [vec3(), vec3()]
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = SharedSystem.materials.beamLinearProgram
        vec2.set(4, 8, this.beam.material.uvTransform as any)
        this.beam.material.diffuse = gradient

        const ringMaterial = new SpriteMaterial()
        ringMaterial.diffuse = SharedSystem.textures.ring
        ringMaterial.program = this.context.get(ParticleEffectPass).program

        const raysMaterial = new SpriteMaterial()
        raysMaterial.diffuse = SharedSystem.textures.rays
        raysMaterial.program = this.context.get(ParticleEffectPass).program

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.Sphere
        this.ring.material = ringMaterial

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.Sphere
        this.flash.material = raysMaterial
    }
    protected clear(): void {
        this.smoke = void SharedSystem.particles.smoke.remove(this.smoke)
    }
    public *activate(transform: mat4, orientation: quat): Generator<ActionSignal> {
        const origin = vec3(0.6,1.5,0)
        const target = vec3(20,1.5,0)
        quat.transform(origin, orientation, origin)
        quat.transform(target, orientation, target)
        mat4.transform(origin, transform, origin as any)
        mat4.transform(target, transform, target as any)

        const particleEffects = this.context.get(ParticleEffectPass)
        vec3.subtract(target, origin, this._direction)

        this.cone.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.cone.transform.position)
        //quat.rotation([0,0,-1], this._direction, this.cone.transform.rotation)
        quat.rotation([0,-1,0], this._direction, this.cone.transform.rotation)
        //quat.multiply(this.cone.transform.rotation, quat.axisAngle(), this.cone.transform.rotation)

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

        this.smoke = this.smoke || SharedSystem.particles.smoke.add({
            uOrigin: vec3.ZERO,
            uLifespan: [1.6,2,-1,0],
            uRotation: [0,2*Math.PI],
            uGravity: [0,3.2,0],
            uSize: [1,3],
            uFieldDomain: vec4.ONE,
            uFieldStrength: vec2.ZERO
        })

        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'beam.path.1': PropertyAnimation([
                { frame: 1.3, value: origin },
                { frame: 1.6, value: target, ease: ease.cubicOut }
            ], vec3.lerp),
            'energy': EmitterTrigger({ frame: 0, value: 128, origin, target: origin }),
            'sparks': EmitterTrigger({ frame: 1.2, value: 32, origin, target: origin }),
            'smoke': EmitterTrigger({ frame: 2.5, value: 8, origin })
        })

        for(const duration = 3, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

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
    }
}